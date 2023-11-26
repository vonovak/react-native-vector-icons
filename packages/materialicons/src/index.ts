/**
 * MaterialIcons icon set component.
 * Usage: <MaterialIcons name="icon-name" size={20} color="#4F8EF7" />
 */

import { createIconSet } from '@react-native-vector-icons/common';
import glyphMap from '../glyphmaps/MaterialIcons.json';

const Icon = createIconSet(glyphMap, 'Material Icons', 'MaterialIcons.ttf');

Icon.loadFont();

export default Icon;
export const { Button, getImageSource, getImageSourceSync } = Icon;

