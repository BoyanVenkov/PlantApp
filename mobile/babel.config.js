// babel-preset-expo auto-detects react-native-worklets/react-native-reanimated
// and adds the right transform plugin itself — don't add it manually here,
// it'll double-transform worklets and break at runtime.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
