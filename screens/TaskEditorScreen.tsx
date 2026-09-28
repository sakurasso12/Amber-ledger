import React, { useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useTaskStore } from '@/store/useTaskStore';
import { useFinanceStore } from '@/store/useFinanceStore';
import { Button, Chip, Screen, SegmentedControl, TextField, DateTimeField } from '@/components/ui';
import { SubtaskChecklist, DraftSubtask } from '@/components/task/SubtaskChecklist';
import { TagInput } from '@/components/task/TagInput';
import { RecurrencePicker } from '@/components/task/RecurrencePicker';
import { CategoryPicker } from '@/components/finance/CategoryPicker';
import { Priority, RecurrenceRule, TaskStatus } from '@/types';
import { generateId } from '@/lib/id';
import { deletePersistedImage, pickAndPersistImage } from '@/lib/imagePicker';
import { useTranslation } from '@/i18n';

export function TaskEditorScreen() {
  const theme = useTheme();
  const tr = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();

  const tasks = useTaskStore((s) => s.tasks);
  const addTask = useTaskStore((s) => s.addTask);
  const editTask = useTaskStore((s) => s.editTask);
  const removeTask = useTaskStore((s) => s.removeTask);

  const existing = useMemo(() => tasks.find((t) => t.id === params.id), [tasks, params.id]);
  const isEditing = !!existing;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [priority, setPriority] = useState<Priority>(existing?.priority ?? 'medium');
  const [status, setStatus] = useState<TaskStatus>(existing?.status ?? 'not_started');
  const [deadlineAt, setDeadlineAt] = useState<string | null>(existing?.deadlineAt ?? null);
  const [isImportant, setIsImportant] = useState(existing?.isImportant ?? false);
  const [tags, setTags] = useState<string[]>(existing?.tags ?? []);
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule | null>(existing?.recurrenceRule ?? null);
  const [subtasks, setSubtasks] = useState<DraftSubtask[]>(
    existing?.subtasks ?? []
  );
  const [imageUri, setImageUri] = useState<string | null>(existing?.imageUri ?? null);

  const categories = useFinanceStore((s) => s.categories);
  const [logExpense, setLogExpense] = useState(!!existing?.expenseOnComplete);
  const [expenseCategoryId, setExpenseCategoryId] = useState(existing?.expenseOnComplete?.categoryId ?? categories[0]?.id ?? '');
  const [expenseAmount, setExpenseAmount] = useState(existing?.expenseOnComplete ? String(existing.expenseOnComplete.amount) : '');

  async function handlePickImage() {
    const uri = await pickAndPersistImage();
    if (!uri) return;
    if (imageUri) await deletePersistedImage(imageUri);
    setImageUri(uri);
  }

  async function handleRemoveImage() {
    if (imageUri) await deletePersistedImage(imageUri);
    setImageUri(null);
  }

  function close() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert(tr.taskEditor.missingTitleTitle, tr.taskEditor.missingTitleMessage);
      return;
    }

    const amountNum = parseFloat(expenseAmount.replace(',', '.'));
    const expenseOnComplete =
      logExpense && expenseCategoryId && Number.isFinite(amountNum) && amountNum > 0
        ? { categoryId: expenseCategoryId, amount: amountNum }
        : null;

    if (isEditing && existing) {
      await editTask({
        ...existing,
        title: title.trim(),
        description,
        priority,
        status,
        deadlineAt,
        isImportant,
        tags,
        recurrenceRule,
        imageUri,
        expenseOnComplete,
        subtasks: subtasks.map((s, index) => ({
          id: s.id.startsWith('draft-') ? generateId() : s.id,
          taskId: existing.id,
          title: s.title,
          isDone: s.isDone,
          sortOrder: index,
        })),
        completedAt: status === 'done' ? existing.completedAt ?? new Date().toISOString() : null,
      });
    } else {
      await addTask({
        title: title.trim(),
        description,
        priority,
        status,
        deadlineAt,
        isImportant,
        tags,
        recurrenceRule,
        imageUri,
        expenseOnComplete,
        subtasks: subtasks.map((s, index) => ({ title: s.title, isDone: s.isDone, sortOrder: index })),
      });
    }
    close();
  }

  function handleDelete() {
    if (!existing) return;
    Alert.alert(tr.taskEditor.deleteConfirmTitle, existing.title, [
      { text: tr.taskEditor.deleteConfirmCancel, style: 'cancel' },
      {
        text: tr.taskEditor.deleteConfirmOk,
        style: 'destructive',
        onPress: async () => {
          if (existing.imageUri) await deletePersistedImage(existing.imageUri);
          await removeTask(existing.id);
          close();
        },
      },
    ]);
  }

  return (
    <Screen>
    <ScrollView
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }]}
    >
      <Text style={[styles.header, { color: theme.colors.text }]}>
        {isEditing ? tr.taskEditor.headerEdit : tr.taskEditor.headerNew}
      </Text>

      <TextField label={tr.taskEditor.titleLabel} value={title} onChangeText={setTitle} placeholder={tr.taskEditor.titlePlaceholder} />
      <TextField
        label={tr.taskEditor.descriptionLabel}
        value={description}
        onChangeText={setDescription}
        placeholder={tr.taskEditor.descriptionPlaceholder}
        multiline
        style={styles.multiline}
      />

      <View style={styles.field}>
        <Text style={[styles.label, { color: theme.colors.textMuted }]}>{tr.taskEditor.photoLabel}</Text>
        {imageUri ? (
          <View style={styles.photoRow}>
            <Image source={{ uri: imageUri }} style={styles.photoPreview} />
            <View style={styles.photoActions}>
              <Pressable onPress={handlePickImage}>
                <Text style={{ color: theme.colors.accent, fontWeight: '600' }}>{tr.taskEditor.replacePhoto}</Text>
              </Pressable>
              <Pressable onPress={handleRemoveImage}>
                <Text style={{ color: theme.colors.danger, fontWeight: '600' }}>{tr.taskEditor.removePhoto}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Chip label={tr.taskEditor.addPhoto} onPress={handlePickImage} />
        )}
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: theme.colors.textMuted }]}>{tr.taskEditor.priorityLabel}</Text>
        <SegmentedControl<Priority>
          value={priority}
          onChange={setPriority}
          segments={[
            { value: 'low', label: tr.priority.low },
            { value: 'medium', label: tr.priority.medium },
            { value: 'high', label: tr.priority.high },
          ]}
        />
      </View>

      {isEditing ? (
        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.colors.textMuted }]}>{tr.taskEditor.statusLabel}</Text>
          <SegmentedControl<TaskStatus>
            value={status}
            onChange={setStatus}
            segments={[
              { value: 'not_started', label: tr.status.notStarted },
              { value: 'in_progress', label: tr.status.inProgress },
              { value: 'done', label: tr.status.done },
            ]}
          />
        </View>
      ) : null}

      <DateTimeField
        label={tr.dateTimeField.label}
        value={deadlineAt}
        onChange={setDeadlineAt}
        dateEditable={!recurrenceRule}
      />

      <View style={styles.field}>
        <Chip
          label={isImportant ? tr.taskEditor.important : tr.taskEditor.markImportant}
          selected={isImportant}
          onPress={() => setIsImportant((v) => !v)}
        />
      </View>

      <TagInput tags={tags} onChange={setTags} />
      <RecurrencePicker value={recurrenceRule} onChange={setRecurrenceRule} />
      <SubtaskChecklist subtasks={subtasks} onChange={setSubtasks} />

      {categories.length > 0 ? (
        <View style={styles.field}>
          <Chip
            label={tr.taskEditor.logExpenseOnComplete}
            selected={logExpense}
            onPress={() => setLogExpense((v) => !v)}
          />
          {logExpense ? (
            <View style={styles.expenseFields}>
              <CategoryPicker categories={categories} value={expenseCategoryId} onChange={setExpenseCategoryId} />
              <TextField
                label={tr.expenseEditor.amountLabel}
                value={expenseAmount}
                onChangeText={setExpenseAmount}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button title={tr.taskEditor.cancel} variant="secondary" onPress={close} style={styles.actionButton} />
        <Button title={tr.taskEditor.save} onPress={handleSave} style={styles.actionButton} />
      </View>
      {isEditing ? <Button title={tr.taskEditor.deleteTask} variant="danger" onPress={handleDelete} /> : null}
    </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 18 },
  header: { fontSize: 20, fontWeight: '700' },
  field: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600' },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  photoPreview: { width: 64, height: 64, borderRadius: 12 },
  photoActions: { gap: 8 },
  expenseFields: { gap: 10, marginTop: 10 },
  actions: { flexDirection: 'row', gap: 10 },
  actionButton: { flex: 1 },
});
