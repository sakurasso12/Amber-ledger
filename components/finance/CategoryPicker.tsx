import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { categoryLabel } from '@/lib/categoryLabel';
import { useTheme } from '@/theme/ThemeProvider';
import { Chip } from '@/components/ui';
import { Category } from '@/types';
import { useTranslation } from '@/i18n';

interface CategoryPickerProps {
  categories: Category[];
  value: string;
  onChange: (categoryId: string) => void;
}

export function CategoryPicker({ categories, value, onChange }: CategoryPickerProps) {
  const theme = useTheme();
  const tr = useTranslation();
  return (
    <>
      <Text style={[styles.label, { color: theme.colors.textMuted }]}>{tr.categoryPicker.label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {categories.map((c) => (
          <Chip key={c.id} label={categoryLabel(c, tr)} selected={value === c.id} onPress={() => onChange(c.id)} color={c.color} />
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  row: { flexDirection: 'row', gap: 6, paddingBottom: 2 },
});
