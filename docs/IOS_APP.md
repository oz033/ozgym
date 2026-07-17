# OZGYM iOS App (Capacitor)

Die Web-App läuft weiter auf Vercel. Zusätzlich gibt es eine **native iPhone-Hülle** mit **ML-Kit-Barcode-Scan** (sofortiges Erkennen wie bei Store-Apps).

## Voraussetzungen (Mac)

1. **macOS** + **Xcode** (App Store)  
2. **CocoaPods**: `sudo gem install cocoapods`  
3. Optional: Apple Developer Account (TestFlight / App Store)  
4. Node.js + npm (wie fürs Web)

> Unter Windows kannst du den Code pflegen und `ios/` committen, **bauen** geht nur auf dem Mac.

## Einmalig einrichten (Mac)

ML-Kit braucht **CocoaPods** (nicht nur SPM).

```bash
cd vibing
npm install
npm run build
npx cap sync ios

# CapApp-SPM nur für reines SPM — bei Barcode-Plugin:
# Xcode-Projekt mit CocoaPods:
cd ios/App
pod install
open App.xcworkspace   # WICHTIG: .xcworkspace, nicht .xcodeproj
```

Falls `pod install` meckert, weil das Projekt noch SPM-only ist:

1. Xcode öffnen (`npx cap open ios`)  
2. Oder Capawesome-Anleitung: Deployment Target **iOS 15.5+**  
3. `pod install` erneut  

In Xcode:

1. **Signing & Capabilities** → Team (Apple-ID)  
2. iPhone per USB, Entwicklermodus an  
3. ▶ Run  

Kamera-Text: `Info.plist` → `NSCameraUsageDescription`.

## Täglicher Workflow

Nach Web-Änderungen:

```bash
npm run ios:sync    # build + cap sync
npx cap open ios    # Xcode öffnen, Run
```

Oder:

```bash
npm run build
npx cap copy ios    # nur Web-Assets kopieren
```

## Was passiert beim Scan?

| Umgebung | Verhalten |
|----------|-----------|
| **Capacitor iOS-App** | Nativer ML-Kit-Scanner (fullscreen), dann Open Food Facts |
| **Safari / PWA** | Web-Scanner (Foto-first), Fallback manuell |

Code: `src/lib/nativePlatform.js` + `FoodTab` `openScanner`.

## Bundle-ID

`app.ozgym.tracker` — in Xcode / Apple Developer anpassen, falls nötig.

## CocoaPods (wichtig)

`@capacitor-mlkit/barcode-scanning` **braucht CocoaPods**, nicht nur SPM.

In `capacitor.config.json`:

```json
"ios": { "packageManager": "Cocoapods" }
```

Nach Plugin-Änderungen immer:

```bash
npx cap sync ios
cd ios/App && pod install
```

## Bekannte Grenzen

- Open Food Facts kann regional lückenhaft sein oder rate-limitten (429)  
- Erste Xcode-Build dauert (Pods / ML Kit)  
- Ohne Mac: native App nicht testbar; Web-PWA bleibt über Vercel
