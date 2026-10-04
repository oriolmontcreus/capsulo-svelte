import { ColorPicker } from 'capsulo/schema';

export default ColorPicker('accentColor')
  .label('Accent color')
  .presetColors(['#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef'], true);
