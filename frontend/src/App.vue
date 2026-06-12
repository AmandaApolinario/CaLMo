<template>
  <router-view />
</template>

<style>
:root {
  --app-bg: #ffffff;
  --app-text: #2c3e50;
  --nav-bg: #2c3e50;
  --nav-text: #ffffff;
  --card-bg: #ffffff;
  --card-border: #e2e8f0;
}

[data-theme="dark"] {
  --app-bg: #1e1e1e;
  --app-text: #e5e7eb;
  --nav-bg: #1e293b;
  --nav-text: #f1f5f9;
  --card-bg: #2d2d2d;
  --card-border: #3d3d3d;
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  display: flex;
  color: var(--app-text);
  min-height: 100vh;
  background-color: var(--app-bg);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background-color: var(--app-bg);
}
</style>
