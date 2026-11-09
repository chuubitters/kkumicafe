# Kkumi Cafe 🍒
### “Every Cake Tells a Story.”

A cozy, vintage-bakery cake decoration game for the browser. Bake a cake, pipe real-looking buttercream, decorate it with fruit, flowers, candles, toppers, text and your own photos, wrap it in a hand-designed cake box, then share it as an image, animated GIF, video, or pop it into the real world through your camera.

Built with **React 18 + TypeScript + Vite + Tailwind CSS**. Every cake element (strawberries, cherries, buttercream, sprinkles, bows, candles, box patterns…) is drawn procedurally on **HTML Canvas**, so there are no image assets to lose and every export matches the editor exactly.

---

## Game flow

1. **Bakery home page:** a vintage storefront with display windows, a PLAY GAME button, My Cake Collection and a sound toggle.
2. **Choose a mode**
   - **Free Cake Studio:** no time limit and no rules.
   - **Cake Challenge:** 5 themed briefs (Love is in the Cake, 90s Birthday Party, Someone Special, Strawberry Dream, Vintage Tea Party). Each has an example cake, required elements and a difficulty. A live checklist tracks your progress, and when you finish the judges award 1–3 stars with feedback.
3. **Cake Decoration Studio**
   - Shape: round, square, heart, oval or star. Size: mini, regular or large. Single, double or triple layers. Cake stand.
   - 6 sponge flavors and 6 fillings (a different filling per layer), with a live cross-section preview.
   - Frosting: buttercream, whipped, chocolate or strawberry cream. Preset and custom colors, ombré gradient, smooth/swirl/combed/rustic textures, and a glossy drip.
   - **Piping:** draw directly on the cake with the Round, Star, Shell, Leaf, Ruffle or Rosette tip, in any color and size. Every stroke stays an editable object.
   - Vintage borders: shell, pearl, ruffle, rosette or star borders, garland swags and a satin ribbon band.
   - Asset library: 6 fruits, 5 sprinkle types, flowers, hearts, stars, bows, ribbons, candles, number candles, figures, toppers, bunting and chocolates.
   - Custom text: preset messages, 6 fonts, color, size and rotation.
   - **Photo cake:** upload a photo and fit it in a circle, square, heart, oval or scalloped frame. Crop, zoom, pan, rotate and resize it, and add a frosting border. It renders as an edible print.
   - Editing: drag & drop, move, rotate and resize knobs, two-finger pinch on touch, duplicate, delete, layer order (forward, backward, front, back), a layers panel, undo/redo, zoom, top/angled view, and reset.
4. **Cake Box Studio**
   - Square, rectangle, heart or round (hatbox) shape.
   - 11 pattern types: gingham, pastel plaid, tartan, vertical/horizontal stripes, polka dots, tiny flowers, hearts, checkerboard, vintage floral and solid. 12 presets (pink/red/blue/lavender/yellow gingham, blue + yellow plaid, …).
   - Background and two pattern colors, pattern scale, band/dot size and rotation. Lid and sides can be designed separately.
   - Cross, single or diagonal ribbon, a satin bow, a window on the lid (round, heart or display), stickers, labels, a gift tag and lid/side messages.
   - Open and close the lid, change the viewing angle (front ↔ top), and see the cake inside.
5. **Finish & share**
   - Four compositions: full presentation, cake with box, cake with postcard, and cake only (transparent PNG).
   - Editable postcard (To / Message / From) and 4 bakery scenes.
   - **PNG / JPG** export (1080×1350).
   - **Animated GIF** (closed box → lid lifts → cake rises → sparkles → zoom), encoded in the browser with `gifenc`.
   - **Video** (MP4 where the browser supports it, otherwise WebM) via `MediaRecorder`.
   - **Camera "AR":** the camera starts only after you press the button. Your cake pops out of its box over the live camera view; drag to move, pinch or scroll to resize, then snap a photo or record a 5-second clip. If the camera is unavailable or denied, you can use a photo as the background instead.
6. **My Cake Collection:** a thumbnail gallery with name and date. Open & edit, duplicate, delete, or export again.

### A note on saved creations
Creations are stored in your browser's **IndexedDB** on your own device. There is no backend. Saved cakes are **not** shared between browsers, devices or users, and clearing site data deletes them. Export a PNG, GIF or video to share a cake.

---

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
```

Requires Node 18+.

## Deploy to Vercel

1. Push this folder to a GitHub repository.
2. In Vercel, choose **Add New → Project** and import the repo. The framework is detected as **Vite**.
3. The included `vercel.json` already sets:
   - Build command: `npm run build`
   - Output directory: `dist`
   - SPA rewrite to `index.html`
4. Deploy. No environment variables are needed (`.env.example` is intentionally absent).

Camera access requires HTTPS, which Vercel provides automatically.

## Project structure

```
src/
  App.tsx              screen flow + hash routing
  types.ts             cake / box / project data model
  lib/                 defaults, challenges & judging, storage (IndexedDB), sound, undo history, geometry, colors
  render/
    cream.ts           buttercream dabs + six piping tips + borders
    assets.ts          procedural fruit, flowers, candles, toppers, stickers, photo frames, text
    cake.ts            3/4-view cake renderer (extruded shapes, frosting textures, drips, garlands, stands)
    box.ts             cake box renderer (patterns, lid, window, ribbons, open/closed)
    patterns.ts        gingham / plaid / tartan / floral … pattern tiles
    scene.ts           final compositions, postcard, reveal animation
    thumbs.ts          palette thumbnails
  export/media.ts      PNG/JPG, GIF (gifenc), video (MediaRecorder)
  components/          Stage (interactive canvas: drag/rotate/scale/pinch/piping), UI kit
  screens/             Home, ModeSelect/Challenges, Editor, BoxStudio, Final, CameraAR, Collection
```

## Known limitations

- **AR** is a polished camera overlay, not true surface tracking (WebXR plane detection isn't available in most mobile browsers). The cake is a movable, scalable object over the live feed.
- **Video export** records the animation in real time (~6 s). Safari produces MP4; Chrome and Firefox produce WebM. Browsers without `MediaRecorder` show a note and offer the GIF instead.
- **Drag-and-drop from the palette** works with mouse and pen. On touchscreens you tap a thumbnail to add the item, then drag it on the cake, so the palette can still scroll.
- Large photos are downscaled to 1200 px on upload to keep saved cakes small.

Fonts (Pacifico, Caveat, Playfair Display, Fredoka, Shrikhand, Dancing Script) are bundled via `@fontsource` under the SIL Open Font License.
