import React, { useState, useRef } from 'react';
import {
  View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Platform,
} from 'react-native';
import { X, Download, Upload, FileJson, FileText, CheckCircle, AlertTriangle, Info } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useActivities } from '@/contexts/ActivityContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useScheduleProfiles } from '@/contexts/ScheduleProfilesContext';
import {
  exportJSON, exportCSV,
  parseBackupFile, previewImport, performImport,
  BackupData, ImportPreview, ImportOptions, ImportResult,
} from '@/services/backupService';

type Tab = 'export' | 'import';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function BackupRestoreModal({ visible, onClose }: Props) {
  const { theme } = useTheme();
  const { activities, addActivity } = useActivities();
  const { settings, updateSettings } = useSettings();
  const { profiles, addProfile } = useScheduleProfiles();

  const [tab, setTab] = useState<Tab>('export');

  // Import flow state
  const [importStep, setImportStep] = useState<'pick' | 'preview' | 'importing' | 'done'>('pick');
  const [importError, setImportError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<BackupData | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    importActivities: true,
    importSettings: false,
    importProfiles: true,
  });
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resetImport = () => {
    setImportStep('pick');
    setImportError(null);
    setParsedData(null);
    setPreview(null);
    setImportResult(null);
  };

  const handleClose = () => {
    resetImport();
    setTab('export');
    onClose();
  };

  // ── Export ────────────────────────────────────────────────────────────────

  const handleExportJSON = () => exportJSON(activities, settings, profiles);
  const handleExportCSV = () => exportCSV(activities);

  // ── Import: file pick (web only) ──────────────────────────────────────────

  const openFilePicker = () => {
    if (Platform.OS !== 'web') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const text = await file.text();
      const result = parseBackupFile(text, file.name);

      if (!result.ok) {
        setImportError(result.error);
        return;
      }

      const p = previewImport(result.data, activities, profiles, result.format);
      setParsedData(result.data);
      setPreview(p);
      setImportStep('preview');
      setImportError(null);
    };
    input.click();
  };

  // ── Import: confirm ───────────────────────────────────────────────────────

  const handleImport = async () => {
    if (!parsedData) return;
    setImportStep('importing');

    const result = await performImport(
      parsedData, activities, profiles,
      importOptions,
      addActivity, addProfile, updateSettings
    );

    setImportResult(result);
    setImportStep('done');
  };

  const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' },
    container: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      maxHeight: '90%',
    },
    handle: {
      width: 40, height: 4, borderRadius: 2,
      backgroundColor: theme.colors.border, alignSelf: 'center', marginTop: 12,
    },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 20, paddingVertical: 16,
      borderBottomWidth: 1, borderColor: theme.colors.divider,
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
    closeBtn: { padding: 8, borderRadius: 20, backgroundColor: theme.colors.backgroundSecondary },
    tabRow: {
      flexDirection: 'row', marginHorizontal: 20, marginTop: 16, marginBottom: 8,
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: 10, padding: 3,
    },
    tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
    tabBtnActive: { backgroundColor: theme.colors.surface },
    tabLabel: { fontSize: 14, fontWeight: '600' },
    scroll: { paddingHorizontal: 20, paddingBottom: 32 },
    section: { marginTop: 16 },
    sectionTitle: {
      fontSize: 11, fontWeight: '700', color: theme.colors.textTertiary,
      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
    },
    exportBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      padding: 16, borderRadius: 14,
      backgroundColor: theme.colors.surface,
      borderWidth: 1, borderColor: theme.colors.border,
      marginBottom: 10,
    },
    exportBtnIcon: {
      width: 42, height: 42, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center',
    },
    exportBtnText: { flex: 1 },
    exportBtnLabel: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
    exportBtnSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
    pickBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
      padding: 16, borderRadius: 14, borderWidth: 2, borderStyle: 'dashed',
      borderColor: theme.colors.primary, marginTop: 8,
    },
    pickBtnText: { fontSize: 15, fontWeight: '600', color: theme.colors.primary },
    errorBox: {
      flexDirection: 'row', gap: 10, padding: 14, borderRadius: 12,
      backgroundColor: theme.colors.errorLight, marginTop: 12,
    },
    errorText: { flex: 1, fontSize: 13, color: theme.colors.error, lineHeight: 20 },
    previewCard: {
      borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border,
      overflow: 'hidden', marginTop: 12,
    },
    previewRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      padding: 14, borderBottomWidth: 1, borderColor: theme.colors.divider,
    },
    previewRowLast: { borderBottomWidth: 0 },
    previewLabel: { fontSize: 14, color: theme.colors.text, fontWeight: '500' },
    previewCount: { fontSize: 14, fontWeight: '700', color: theme.colors.primary },
    previewCountDup: { fontSize: 14, fontWeight: '700', color: theme.colors.textTertiary },
    warningBox: {
      flexDirection: 'row', gap: 8, padding: 12, borderRadius: 10,
      backgroundColor: theme.colors.warningLight, marginTop: 10,
    },
    warningText: { flex: 1, fontSize: 12, color: theme.colors.warning, lineHeight: 18 },
    optionsSection: { marginTop: 16 },
    optionRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      padding: 12, borderRadius: 10, marginBottom: 6,
      backgroundColor: theme.colors.backgroundSecondary,
    },
    optionCheck: {
      width: 22, height: 22, borderRadius: 6,
      borderWidth: 2, alignItems: 'center', justifyContent: 'center',
    },
    optionLabel: { flex: 1, fontSize: 14, color: theme.colors.text, fontWeight: '500' },
    optionSub: { fontSize: 12, color: theme.colors.textSecondary },
    importBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      paddingVertical: 14, borderRadius: 12,
      backgroundColor: theme.colors.primary, marginTop: 16,
    },
    importBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
    backBtn: {
      paddingVertical: 12, borderRadius: 12,
      borderWidth: 1, borderColor: theme.colors.border,
      alignItems: 'center', marginTop: 8,
    },
    backBtnText: { fontSize: 14, fontWeight: '600', color: theme.colors.textSecondary },
    resultCard: {
      borderRadius: 14, padding: 20, borderWidth: 1,
      borderColor: theme.colors.border, marginTop: 12,
    },
    resultRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    resultLabel: { fontSize: 14, color: theme.colors.textSecondary },
    resultValue: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
    resultErrorItem: { fontSize: 12, color: theme.colors.error, lineHeight: 18 },
    doneBtn: {
      paddingVertical: 14, borderRadius: 12,
      backgroundColor: theme.colors.success, alignItems: 'center', marginTop: 16,
    },
    doneBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
    notSupportedBox: {
      padding: 20, alignItems: 'center', gap: 8,
    },
    notSupportedText: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center' },
  });

  const renderExportTab = () => (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Export</Text>

      <TouchableOpacity style={s.exportBtn} onPress={handleExportJSON}>
        <View style={[s.exportBtnIcon, { backgroundColor: theme.colors.primaryLight }]}>
          <FileJson color={theme.colors.primary} size={22} />
        </View>
        <View style={s.exportBtnText}>
          <Text style={s.exportBtnLabel}>Full Backup (JSON)</Text>
          <Text style={s.exportBtnSub}>Activities, settings & profiles</Text>
        </View>
        <Download color={theme.colors.textSecondary} size={18} />
      </TouchableOpacity>

      <TouchableOpacity style={s.exportBtn} onPress={handleExportCSV}>
        <View style={[s.exportBtnIcon, { backgroundColor: theme.colors.successLight }]}>
          <FileText color={theme.colors.success} size={22} />
        </View>
        <View style={s.exportBtnText}>
          <Text style={s.exportBtnLabel}>Activities (CSV)</Text>
          <Text style={s.exportBtnSub}>Opens in Excel / Google Sheets</Text>
        </View>
        <Download color={theme.colors.textSecondary} size={18} />
      </TouchableOpacity>
    </View>
  );

  const renderImportTab = () => {
    if (Platform.OS !== 'web') {
      return (
        <View style={s.notSupportedBox}>
          <Info color={theme.colors.textTertiary} size={32} />
          <Text style={s.notSupportedText}>
            File import is only supported in the web version.
          </Text>
        </View>
      );
    }

    if (importStep === 'pick') {
      return (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Import from file</Text>

          <TouchableOpacity style={s.pickBtn} onPress={openFilePicker}>
            <Upload color={theme.colors.primary} size={20} />
            <Text style={s.pickBtnText}>Choose .json or .csv file</Text>
          </TouchableOpacity>

          {importError && (
            <View style={s.errorBox}>
              <AlertTriangle color={theme.colors.error} size={18} />
              <Text style={s.errorText}>{importError}</Text>
            </View>
          )}
        </View>
      );
    }

    if (importStep === 'preview' && preview) {
      return (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Import Preview</Text>

          <View style={s.previewCard}>
            <View style={s.previewRow}>
              <Text style={s.previewLabel}>New activities</Text>
              <Text style={s.previewCount}>{preview.activitiesNew}</Text>
            </View>
            <View style={s.previewRow}>
              <Text style={s.previewLabel}>Duplicate activities (skip)</Text>
              <Text style={s.previewCountDup}>{preview.activitiesDuplicate}</Text>
            </View>
            {preview.format === 'json' && (
              <>
                <View style={s.previewRow}>
                  <Text style={s.previewLabel}>New profiles</Text>
                  <Text style={s.previewCount}>{preview.profilesNew}</Text>
                </View>
                <View style={s.previewRow}>
                  <Text style={s.previewLabel}>Duplicate profiles (skip)</Text>
                  <Text style={s.previewCountDup}>{preview.profilesDuplicate}</Text>
                </View>
                <View style={[s.previewRow, s.previewRowLast]}>
                  <Text style={s.previewLabel}>Settings included</Text>
                  <Text style={[s.previewCount, !preview.hasSettings && { color: theme.colors.textTertiary }]}>
                    {preview.hasSettings ? 'Yes' : 'None'}
                  </Text>
                </View>
              </>
            )}
          </View>

          {preview.warnings.map((w, i) => (
            <View key={i} style={s.warningBox}>
              <AlertTriangle color={theme.colors.warning} size={15} />
              <Text style={s.warningText}>{w}</Text>
            </View>
          ))}

          <View style={s.optionsSection}>
            <Text style={s.sectionTitle}>What to import</Text>

            {renderOption(
              'Activities',
              `${preview.activitiesNew} new`,
              'importActivities',
              preview.activitiesNew === 0
            )}
            {preview.format === 'json' && renderOption(
              'Profiles',
              `${preview.profilesNew} new`,
              'importProfiles',
              preview.profilesNew === 0
            )}
            {preview.format === 'json' && renderOption(
              'Settings',
              preview.hasSettings ? 'Will overwrite current settings' : 'None in file',
              'importSettings',
              !preview.hasSettings
            )}
          </View>

          <TouchableOpacity
            style={[s.importBtn, preview.activitiesNew === 0 && preview.profilesNew === 0 && !preview.hasSettings && { opacity: 0.5 }]}
            onPress={handleImport}
            disabled={preview.activitiesNew === 0 && preview.profilesNew === 0 && !preview.hasSettings}
          >
            <Upload color="#FFFFFF" size={18} />
            <Text style={s.importBtnText}>Import Now</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.backBtn} onPress={resetImport}>
            <Text style={s.backBtnText}>Choose a different file</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (importStep === 'importing') {
      return (
        <View style={[s.section, { alignItems: 'center', paddingVertical: 40, gap: 16 }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ fontSize: 15, color: theme.colors.textSecondary }}>Importing data…</Text>
        </View>
      );
    }

    if (importStep === 'done' && importResult) {
      const hasErrors = importResult.errors.length > 0;
      return (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Import Complete</Text>
          <View style={s.resultCard}>
            <View style={s.resultRow}>
              <Text style={s.resultLabel}>Activities added</Text>
              <Text style={s.resultValue}>{importResult.activitiesAdded}</Text>
            </View>
            <View style={s.resultRow}>
              <Text style={s.resultLabel}>Activities skipped</Text>
              <Text style={s.resultValue}>{importResult.activitiesSkipped}</Text>
            </View>
            <View style={s.resultRow}>
              <Text style={s.resultLabel}>Profiles added</Text>
              <Text style={s.resultValue}>{importResult.profilesAdded}</Text>
            </View>
            <View style={s.resultRow}>
              <Text style={s.resultLabel}>Settings applied</Text>
              <Text style={s.resultValue}>{importResult.settingsApplied ? 'Yes' : 'No'}</Text>
            </View>
            {hasErrors && importResult.errors.map((e, i) => (
              <Text key={i} style={s.resultErrorItem}>⚠ {e}</Text>
            ))}
          </View>

          <TouchableOpacity style={s.doneBtn} onPress={resetImport}>
            <Text style={s.doneBtnText}>
              {hasErrors ? 'Import Finished (with warnings)' : 'Done'}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  const renderOption = (
    label: string,
    sub: string,
    key: keyof ImportOptions,
    disabled: boolean
  ) => {
    const checked = importOptions[key] && !disabled;
    return (
      <TouchableOpacity
        key={key}
        style={[s.optionRow, disabled && { opacity: 0.4 }]}
        onPress={() => !disabled && setImportOptions(o => ({ ...o, [key]: !o[key] }))}
        disabled={disabled}
      >
        <View style={[s.optionCheck, {
          borderColor: checked ? theme.colors.primary : theme.colors.border,
          backgroundColor: checked ? theme.colors.primary : 'transparent',
        }]}>
          {checked && <CheckCircle color="#FFFFFF" size={14} />}
        </View>
        <View>
          <Text style={s.optionLabel}>{label}</Text>
          <Text style={s.optionSub}>{sub}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={s.overlay}>
        <View style={s.container}>
          <View style={s.handle} />
          <View style={s.header}>
            <Text style={s.headerTitle}>Backup & Restore</Text>
            <TouchableOpacity style={s.closeBtn} onPress={handleClose}>
              <X color={theme.colors.textSecondary} size={20} />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={s.tabRow}>
            {(['export', 'import'] as Tab[]).map(t => (
              <TouchableOpacity
                key={t}
                style={[s.tabBtn, tab === t && s.tabBtnActive]}
                onPress={() => { setTab(t); resetImport(); }}
              >
                <Text style={[s.tabLabel, { color: tab === t ? theme.colors.primary : theme.colors.textSecondary }]}>
                  {t === 'export' ? 'Export' : 'Import'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView
            style={s.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {tab === 'export' ? renderExportTab() : renderImportTab()}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
