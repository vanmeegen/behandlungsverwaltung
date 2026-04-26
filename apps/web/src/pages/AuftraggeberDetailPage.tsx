import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { TherapieList } from '../components/TherapieList';
import type { AuftraggeberStore } from '../models/AuftraggeberStore';
import type { TherapieStore } from '../models/TherapieStore';

interface AuftraggeberDetailPageProps {
  auftraggeberStore: AuftraggeberStore;
  therapieStore: TherapieStore;
}

export const AuftraggeberDetailPage = observer(
  ({ auftraggeberStore, therapieStore }: AuftraggeberDetailPageProps) => {
    const { id } = useParams<{ id: string }>();

    useEffect(() => {
      if (!id) return;
      void auftraggeberStore.load();
      void therapieStore.loadByAuftraggeber(id);
    }, [id, auftraggeberStore, therapieStore]);

    const ag = id ? auftraggeberStore.items.find((a) => a.id === id) : undefined;
    const therapien = id ? (therapieStore.byAuftraggeber[id] ?? []) : [];

    return (
      <Box data-testselector="auftraggeber-detail-page">
        <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
          {ag?.typ === 'firma' && (
            <span data-testselector="auftraggeber-detail-firmenname">{ag.firmenname}</span>
          )}
          {ag?.typ === 'person' && (
            <>
              <span data-testselector="auftraggeber-detail-nachname">{ag.nachname}</span>
              {', '}
              <span data-testselector="auftraggeber-detail-vorname">{ag.vorname}</span>
            </>
          )}
          {!ag && 'Auftraggeber'}
        </Typography>
        {ag?.typ === 'firma' && ag.abteilung && (
          <Typography
            variant="subtitle1"
            sx={{ mb: 2 }}
            data-testselector="auftraggeber-detail-abteilung"
          >
            {ag.abteilung}
          </Typography>
        )}
        {ag && (
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
                Rechnungskopf-Text
              </Typography>
              <Typography
                variant="body1"
                sx={{ whiteSpace: 'pre-wrap' }}
                data-testselector="auftraggeber-detail-rechnungskopf"
              >
                {ag.rechnungskopfText}
              </Typography>
            </CardContent>
          </Card>
        )}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
              Therapien
            </Typography>
            <TherapieList items={therapien} />
          </CardContent>
        </Card>
      </Box>
    );
  },
);
