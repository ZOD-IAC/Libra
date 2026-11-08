const { withAppBuildGradle, withAndroidManifest } = require('expo/config-plugins');
module.exports = (config) => {
  config = withAppBuildGradle(config, (mod) => {
    let text = mod.modResults.contents;
    const marker = '// VERDANT_LOCAL_SIGNING';
    if (!text.includes(marker)) {
      const block = `${marker}
    signingConfigs {
        verdantRelease {
            def storePath = System.getenv('VERDANT_KEYSTORE')
            if (storePath) {
                storeFile file(storePath)
                storePassword System.getenv('VERDANT_STORE_PASSWORD')
                keyAlias System.getenv('VERDANT_KEY_ALIAS')
                keyPassword System.getenv('VERDANT_KEY_PASSWORD')
            }
        }
    }
`;
      const pos = text.indexOf('    buildTypes {');
      if (pos < 0)
        throw new Error('Cannot install release signing: Android Gradle template changed.');
      text = text.slice(0, pos) + block + text.slice(pos);
      const release = /release\s*\{[\s\S]*?signingConfig signingConfigs\.debug/;
      if (!release.test(text))
        throw new Error('Cannot replace debug release signing. Inspect generated Android project.');
      text = text.replace(release, (m) =>
        m.replace(
          'signingConfig signingConfigs.debug',
          'signingConfig signingConfigs.verdantRelease',
        ),
      );
      text += `\n// Fail before building a release artifact with missing signing credentials.\ngradle.taskGraph.whenReady { graph ->\n if (graph.allTasks.any { it.name.toLowerCase().contains('release') }) {\n ['VERDANT_KEYSTORE','VERDANT_STORE_PASSWORD','VERDANT_KEY_ALIAS','VERDANT_KEY_PASSWORD'].each { name ->\n if (!System.getenv(name)) throw new GradleException('Missing release signing environment variable: ' + name)\n }\n }\n}\n`;
      mod.modResults.contents = text;
    }
    return mod;
  });
  return withAndroidManifest(config, (mod) => {
    const app = mod.modResults.manifest.application[0];
    app.$['android:allowBackup'] = 'false';
    app.$['android:fullBackupContent'] = 'false';
    return mod;
  });
};
