---
title: Extension builder
description: Build the @context and JSON Schema for adding your own attributes to a catalog model, in the browser
---

# Extension builder

Use it when your system needs attributes that a catalog model does not have. Pick the model and enter your attributes; you get two files:

- **@context**: imports the catalog `@context` by URL and defines only your attributes, so the catalog attributes keep their IRIs. It is the profile pattern from [Adding attributes](/en/guide/extend#writing-a-profile).
- **JSON Schema**: validates the catalog attributes and yours. It is a copy of the catalog schema at one version, so it does not follow new minor versions of the catalog ([Adding attributes](/en/guide/extend#updates)).

Use a namespace under a domain you control. If an attribute would be useful to many systems, please propose it to the catalog (link below). What you enter stays on this page and is not sent anywhere, except when you open the link to the proposal form: that sends the attribute names and descriptions you entered to GitHub, to fill in the form.

<ExtensionBuilder lang="en" />
