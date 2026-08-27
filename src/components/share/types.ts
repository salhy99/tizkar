import { ReactElement } from 'react';

export interface ShareData {
  title: string;
  groomName?: string;
  brideName?: string;
  dateText?: string;
  timeText?: string;
  venueName?: string;
  publicUrl: string;
  templateSlug: string;
}

export interface ShareVisualAdapter {
  renderOg(data: ShareData): ReactElement;
  renderStory(data: ShareData): ReactElement;
}
