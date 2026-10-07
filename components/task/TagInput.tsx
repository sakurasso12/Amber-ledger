import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';
import { TextField } from '@/components/ui';
import { useTranslation } from '@/i18n';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export function TagInput({ tags, onChange }: TagInputProps) {
  const theme = useTheme();
  const tr = useTranslation();
  const [draft, setDraft] = useState('');

  function addTag() {
    const tag = draft.trim().replace(/^#/, '');
    if (!tag || tags.includes(tag)) {
      setDraft('');
      return;
    }
    onChange([...tags, tag]);
    setDraft('');
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: theme.colors.textMuted }]}>{tr.tagInput.title}</Text>
      {tags.length > 0 ? (
        <View style={styles.tagsRow}>
          {tags.map((tag) => (
            <Pressable
              key={tag}
              onPress={() => removeTag(tag)}
              style={[styles.tag, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}
            >
              <Text style={{ color: theme.colors.text, fontSize: 12 }}>#{tag} ✕</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <TextField
        value={draft}
        onChangeText={setDraft}
        placeholder={tr.tagInput.addPlaceholder}
        onSubmitEditing={addTag}
        returnKeyType="done"
        autoCapitalize="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 100, borderWidth: 1 },
});
