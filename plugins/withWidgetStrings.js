/**
 * Translates the home screen widgets' name and description in the system widget picker.
 *
 * react-native-android-widget writes `label` straight into the manifest and `description` into
 * res/values/strings.xml only, so both always showed in one language. Here the labels point at
 * string resources (see app.json: "@string/widget_<name>_label") and this plugin adds English
 * defaults plus Russian and Ukrainian copies — Android then picks the one matching the system
 * language. The English descriptions come from app.json via the widget plugin itself.
 */
const fs = require('fs');
const path = require('path');
const { AndroidConfig, withDangerousMod, withStringsXml } = require('expo/config-plugins');

const STRINGS = {
  en: {
    widget_amberledgertoday_label: 'Amber Ledger — today',
    widget_amberledgerdayoff_label: 'Amber Ledger — day off',
    widget_amberledgernexttask_label: 'Amber Ledger — next task',
  },
  ru: {
    widget_amberledgertoday_label: 'Amber Ledger — сегодня',
    widget_amberledgertoday_description: 'Ближайшие задачи и траты за сегодня (большой)',
    widget_amberledgerdayoff_label: 'Amber Ledger — выходной',
    widget_amberledgerdayoff_description: 'Когда ближайший выходной (маленький)',
    widget_amberledgernexttask_label: 'Amber Ledger — ближайшая задача',
    widget_amberledgernexttask_description: 'Ближайшая задача и сколько до неё осталось (средний)',
  },
  uk: {
    widget_amberledgertoday_label: 'Amber Ledger — сьогодні',
    widget_amberledgertoday_description: 'Найближчі задачі й витрати за сьогодні (великий)',
    widget_amberledgerdayoff_label: 'Amber Ledger — вихідний',
    widget_amberledgerdayoff_description: 'Коли найближчий вихідний (маленький)',
    widget_amberledgernexttask_label: 'Amber Ledger — найближча задача',
    widget_amberledgernexttask_description: 'Найближча задача і скільки до неї лишилося (середній)',
  },
};

const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/'/g, "\\'");

module.exports = function withWidgetStrings(config) {
  // English defaults for the labels (descriptions are already written by the widget plugin).
  config = withStringsXml(config, (stringsConfig) => {
    stringsConfig.modResults = AndroidConfig.Strings.setStringItem(
      Object.entries(STRINGS.en).map(([name, text]) => ({ $: { name, translatable: 'true' }, _: escape(text) })),
      stringsConfig.modResults
    );
    return stringsConfig;
  });

  return withDangerousMod(config, [
    'android',
    (modConfig) => {
      const resDir = path.join(modConfig.modRequest.platformProjectRoot, 'app/src/main/res');
      for (const lang of ['ru', 'uk']) {
        const dir = path.join(resDir, `values-${lang}`);
        fs.mkdirSync(dir, { recursive: true });
        const items = Object.entries(STRINGS[lang])
          .map(([name, text]) => `  <string name="${name}">${escape(text)}</string>`)
          .join('\n');
        // The widget plugin marks descriptions translatable="false"; without tools:ignore, lint
        // would flag these copies as extra translations and fail the release build.
        fs.writeFileSync(path.join(dir, 'widget_strings.xml'), `<?xml version="1.0" encoding="utf-8"?>\n<resources xmlns:tools="http://schemas.android.com/tools" tools:ignore="ExtraTranslation">\n${items}\n</resources>\n`);
      }
      return modConfig;
    },
  ]);
};
