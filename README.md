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

It's never gonna work though. Embrace docker

```bash
% docker run --rm -ti -v $(pwd):/app node:12 bash
$ cd app
$ npm i
$ npm run build
```

Push these changes. They will take effect immediately. 


# Actions

## Generic
### Setup
### Deploy

## Speller
### Setup
### Deploy
