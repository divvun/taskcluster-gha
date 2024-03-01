# Introduction

GitHub Actions for use by the Divvun CI system.

This repo is used by [taskcluster-scripts](https://github.com/divvun/taskcluster-scripts) to perform actions such as building language files and deploying new versions of iOS/Android keyboards, among others. 

# Building

Run `npm run build` before comitting, commit any additions to `node_modules`, as Github Actions requires all modules to be installed.

If `npm run build` causes errors, a simple `tsc` might do the trick.

Note.. You will need tsc installed globally. On a mac, go ahead and do a

```
brew install typescript
```

# Developing

You should do development using a branch so you don't break CI nor pollute the `main` branch with the inevitable slew of test commits.

Detailed instructions for the CI development process are in the [`taskcluster-scripts` repo](https://github.com/divvun/taskcluster-scripts/#developing)