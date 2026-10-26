# Domura

Monorepo for Domura by DUE Studios.

| Path | Stack |
|------|-------|
| `ios/` | SwiftUI, iOS 17+ (project generated with XcodeGen) |
| `android/` | Kotlin, Jetpack Compose, AGP 9 |
| `backend/` | Supabase (local dev via Supabase CLI) |

## iOS

```sh
brew install xcodegen
cd ios && xcodegen generate
open Domura.xcodeproj
```

`project.yml` is the source of truth; regenerate the Xcode project after adding files or targets.

## Android

Open `android/` in Android Studio, or:

```sh
cd android && ./gradlew assembleDebug
```

## Backend (Supabase)

```sh
brew install supabase/tap/supabase
cd backend
supabase start          # local stack (requires Docker)
supabase migration new <name>
supabase db reset       # apply migrations locally
```

Link to the hosted project with `supabase link --project-ref <ref>`.
