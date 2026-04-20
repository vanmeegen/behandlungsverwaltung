import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { TherapieList } from '../components/TherapieList';
import type { KindStore } from '../models/KindStore';
import type { TherapieStore } from '../models/TherapieStore';

interface KindDetailPageProps {
  kindStore: KindStore;
  therapieStore: TherapieStore;
}

export const KindDetailPage = observer(({ kindStore, therapieStore }: KindDetailPageProps) => {
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    if (!id) return;
    void kindStore.load();
    void therapieStore.loadByKind(id);
  }, [id, kindStore, therapieStore]);

  const kind = id ? kindStore.items.find((k) => k.id === id) : undefined;
  const therapien = id ? (therapieStore.byKind[id] ?? []) : [];

  return (
    <Box data-testselector="kind-detail-page">
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
        {kind ? (
          <>
            <span data-testselector="kind-detail-nachname">{kind.nachname}</span>
            {', '}
            <span data-testselector="kind-detail-vorname">{kind.vorname}</span>
          </>
        ) : (
          'Kind'
        )}
      </Typography>
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
});
