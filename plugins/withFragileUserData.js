const { withAndroidManifest } = require("@expo/config-plugins");

module.exports = function withFragileUserData(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const mainApplication = androidManifest.manifest.application[0];

    // Add hasFragileUserData to the application tag
    mainApplication.$["android:hasFragileUserData"] = "true";

    return config;
  });
};
