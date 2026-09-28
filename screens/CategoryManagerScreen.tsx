import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Button, ProgressBar, Screen, TextField } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { Category } from '@/types';
import { monthRange } from '@/lib/dateRanges';
import { totalExpenses } from '@/lib/expenses';

const PALETTE = ['#C1502E', '#3E7FB8', '#8A5CB8', '#3E8F5C', '#8A7A64', '#C98A1E', '#5A8F6B', '#B9702E'];

export function CategoryManagerScreen() {
  const theme = useTheme();
  const tr = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currency = useSettingsStore((s) => s.settings.currency);
  const categories = useFinanceStore((s) => s.categories);
  const expenses = useFinanceStore((s) => s.expenses);
  const addCategory = useFinanceStore((s) => s.addCategory);
  const editCategory = useFinanceStore((s) => s.editCategory);
  const removeCategory = useFinanceStore((s) => s.removeCategory);

  const spentThisMonthByCategory = useMemo(() => {
    const range = monthRange(new Date());
    const map = new Map<string, number>();
    for (const category of categories) {
      map.set(category.id, totalExpenses(expenses.filter((e) => e.categoryId === category.id), range));
    }
    return map;
  }, [categories, expenses]);

  const [name, setName] = useState('');
  const [color, setColor] = useState(PALETTE[0]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [limitDraft, setLimitDraft] = useState('');

  async function handleAdd() {
    if (!name.trim()) return;
    await addCategory(name.trim(), color);
    setName('');
  }

  async function handleRemove(id: string, categoryName: string) {
    const result = await removeCategory(id);
    if (!result.ok) {
      Alert.alert(tr.categoryManager.cannotDeleteTitle, tr.categoryManager.cannotDeleteMessage(categoryName, result.expenseCount));
    }
  }

  function openLimitEditor(category: Category) {
    setEditingCategory(category);
    setLimitDraft(category.limitMonth ? String(category.limitMonth) : '');
  }

  async function saveLimit() {
    if (!editingCategory) return;
    const n = parseFloat(limitDraft.replace(',', '.'));
    const limitMonth = limitDraft.trim() && Number.isFinite(n) && n > 0 ? n : null;
    await editCategory({ ...editingCategory, limitMonth });
    setEditingCategory(null);
  }

  return (
    <Screen style={{ paddingTop: insets.top }}>
      <View style={styles.headerRow}>
        <Text style={[styles.header, { color: theme.colors.text }]}>{tr.categoryManager.header}</Text>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/finance'))}>
          <Text style={{ color: theme.colors.accent, fontWeight: '600' }}>{tr.categoryManager.done}</Text>
        </Pressable>
      </View>

      <FlatList
        data={categories}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => openLimitEditor(item)}
            style={[styles.row, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          >
            <View style={[styles.dot, { backgroundColor: item.color }]} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.name, { color: theme.colors.text }]}>{item.name}</Text>
              {item.limitMonth ? (
                <>
                  <Text style={{ color: theme.colors.textMuted, fontSize: 11 }}>
                    {tr.categoryManager.limitSet(
                      `${(spentThisMonthByCategory.get(item.id) ?? 0).toFixed(0)}/${item.limitMonth.toFixed(0)} ${currency}`
                    )}
                  </Text>
                  <ProgressBar ratio={(spentThisMonthByCategory.get(item.id) ?? 0) / item.limitMonth} color={item.color} height={4} />
                </>
              ) : null}
            </View>
            <Pressable onPress={() => handleRemove(item.id, item.name)} hitSlop={8}>
              <Text style={{ color: theme.colors.danger, fontSize: 15 }}>{tr.categoryManager.deleteRow}</Text>
            </Pressable>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListFooterComponent={
          <View style={styles.addSection}>
            <Text style={[styles.addLabel, { color: theme.colors.textMuted }]}>{tr.categoryManager.newCategory}</Text>
            <TextField value={name} onChangeText={setName} placeholder={tr.categoryManager.namePlaceholder} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.paletteRow}>
              {PALETTE.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setColor(c)}
                  style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchActive]}
                />
              ))}
            </ScrollView>
            <Button title={tr.categoryManager.addButton} onPress={handleAdd} />
          </View>
        }
      />

      <Modal visible={!!editingCategory} transparent animationType="fade" onRequestClose={() => setEditingCategory(null)}>
        <Pressable style={styles.backdrop} onPress={() => setEditingCategory(null)}>
          <Pressable
            style={[styles.dialog, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.dialogTitle, { color: theme.colors.text }]}>
              {tr.categoryManager.editLimitTitle} · {editingCategory?.name}
            </Text>
            <TextField
              label={tr.categoryManager.limitLabel}
              value={limitDraft}
              onChangeText={setLimitDraft}
              placeholder={tr.categoryManager.limitPlaceholder}
              keyboardType="decimal-pad"
              autoFocus
            />
            <View style={styles.dialogActions}>
              <Button title={tr.taskEditor.cancel} variant="secondary" onPress={() => setEditingCategory(null)} style={styles.dialogButton} />
              <Button title={tr.taskEditor.save} onPress={saveLimit} style={styles.dialogButton} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  header: { fontSize: 22, fontWeight: '700' },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  name: { fontSize: 15, fontWeight: '600' },
  addSection: { gap: 12, marginTop: 20 },
  addLabel: { fontSize: 13, fontWeight: '600' },
  paletteRow: { flexDirection: 'row', gap: 10 },
  swatch: { width: 32, height: 32, borderRadius: 16 },
  swatchActive: { borderWidth: 3, borderColor: '#fff' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  dialog: { width: 280, borderRadius: 18, borderWidth: 1, padding: 18, gap: 12 },
  dialogTitle: { fontSize: 16, fontWeight: '700' },
  dialogActions: { flexDirection: 'row', gap: 10 },
  dialogButton: { flex: 1 },
});
