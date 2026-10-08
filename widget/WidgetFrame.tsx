import React from 'react';
import { FlexWidget, ImageWidget, OverlapWidget } from 'react-native-android-widget';
import { WidgetCorners, widgetCornerStyle, WidgetPalette } from './widgetShared';

export interface WidgetPhoto {
  /** data: URI — RemoteViews can't load app-private file:// paths (see widget-task-handler.ts). */
  image: string;
  /** Size in dp to scale the photo to before the centre crop — keeps its proportions. */
  width: number;
  height: number;
}

interface WidgetFrameProps {
  palette: WidgetPalette;
  corners: WidgetCorners | null;
  photo: WidgetPhoto | null;
  padding?: number;
  justifyContent?: 'flex-start' | 'center' | 'space-between';
  flexDirection?: 'column' | 'row';
  /** Where a tap goes — the app by default; the streak widget opens its habit picker. */
  openUri?: string;
  children: React.ReactNode;
}

/** Outer shell shared by all home screen widgets: background colour or photo + scrim, and the
 * corner shape from the active layout. Tapping anywhere opens the app (or `openUri`). */
export function WidgetFrame({ palette, corners, photo, padding = 14, justifyContent, flexDirection = 'column', openUri, children }: WidgetFrameProps) {
  const cornerStyle = widgetCornerStyle(palette.radius, corners);
  const content = (
    <FlexWidget
      clickAction={openUri ? 'OPEN_URI' : 'OPEN_APP'}
      clickActionData={openUri ? { uri: openUri } : undefined}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection,
        justifyContent,
        backgroundColor: photo ? undefined : (palette.background as `#${string}`),
        padding,
        ...cornerStyle,
      }}
    >
      {children}
    </FlexWidget>
  );
  if (!photo) return content;

  return (
    <OverlapWidget style={{ height: 'match_parent', width: 'match_parent', overflow: 'hidden', ...cornerStyle }}>
      <ImageWidget
        image={photo.image as `data:image${string}`}
        imageWidth={photo.width}
        imageHeight={photo.height}
        resizeMode="cover"
        style={{ height: 'match_parent', width: 'match_parent', ...cornerStyle }}
      />
      <FlexWidget style={{ height: 'match_parent', width: 'match_parent', backgroundColor: '#00000066', ...cornerStyle }} />
      {content}
    </OverlapWidget>
  );
}
