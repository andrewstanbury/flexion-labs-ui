import { mediaFilesFor } from '../mediaFiles';

describe('mediaFilesFor', () => {
  it('always includes thumbnail alone when there is no other media', () => {
    expect(mediaFilesFor({ has_video: false, has_preview: false })).toEqual(['thumbnail']);
  });

  it('includes preview and video when present', () => {
    expect(mediaFilesFor({ has_video: true, has_preview: true })).toEqual([
      'thumbnail',
      'preview',
      'video',
    ]);
  });

  it('appends panel1..panelN in order when panel_count is set', () => {
    expect(mediaFilesFor({ has_video: false, has_preview: false, panel_count: 3 })).toEqual([
      'thumbnail',
      'panel1',
      'panel2',
      'panel3',
    ]);
  });

  it('combines panels with preview/video when both are present', () => {
    expect(
      mediaFilesFor({ has_video: true, has_preview: false, panel_count: 2 }),
    ).toEqual(['thumbnail', 'video', 'panel1', 'panel2']);
  });

  it('omits panels when panel_count is 0 or absent', () => {
    expect(mediaFilesFor({ has_video: false, has_preview: false, panel_count: 0 })).toEqual([
      'thumbnail',
    ]);
    expect(mediaFilesFor({ has_video: false, has_preview: false })).toEqual(['thumbnail']);
  });

  it('clamps panel_count to the supported 1..6 range', () => {
    expect(mediaFilesFor({ has_video: false, has_preview: false, panel_count: 9 })).toEqual([
      'thumbnail',
      'panel1',
      'panel2',
      'panel3',
      'panel4',
      'panel5',
      'panel6',
    ]);
    expect(mediaFilesFor({ has_video: false, has_preview: false, panel_count: -1 })).toEqual([
      'thumbnail',
    ]);
  });
});
