import { THERAPIE_FORM_LABELS } from '@behandlungsverwaltung/shared';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import { observer } from 'mobx-react-lite';
import { Link as RouterLink } from 'react-router-dom';
import type { Therapie } from '../models/TherapieStore';

interface TherapieListProps {
  items: Therapie[];
  emptyText?: string;
}

export const TherapieList = observer(
  ({ items, emptyText = 'Noch keine Therapien erfasst.' }: TherapieListProps) => {
    if (items.length === 0) {
      return (
        <Typography data-testselector="therapie-list-empty" color="text.secondary">
          {emptyText}
        </Typography>
      );
    }
    return (
      <List data-testselector="therapie-list">
        {items.map((t) => (
          <ListItem
            key={t.id}
            data-testselector="therapie-row"
            secondaryAction={
              <Button
                component={RouterLink}
                to={`/therapien/${t.id}`}
                size="small"
                variant="outlined"
                data-testselector={`therapie-row-edit-${t.id}`}
              >
                Bearbeiten
              </Button>
            }
          >
            <ListItemText
              primary={
                <Box component="span">
                  <span data-testselector={`therapie-row-form-${t.id}`}>
                    {THERAPIE_FORM_LABELS[t.form]}
                  </span>
                  {' · '}
                  <span data-testselector={`therapie-row-be-${t.id}`}>{t.bewilligteBe} BE</span>
                  {t.arbeitsthema && (
                    <>
                      {' · '}
                      <span data-testselector={`therapie-row-arbeitsthema-${t.id}`}>
                        {t.arbeitsthema}
                      </span>
                    </>
                  )}
                </Box>
              }
            />
          </ListItem>
        ))}
      </List>
    );
  },
);
