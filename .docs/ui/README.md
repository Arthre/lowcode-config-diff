# UI 妯″潡

鍓嶇瑙嗗浘涓庣粍浠跺眰銆傜紪杈戝櫒涓庨〉闈㈠壇浣滅敤鍙緷璧?Vue锛?*涓嶅緱**鎶?Vue / DOM 寮曞叆 `src/core/*`銆?

## 璁捐鏉冨▉

- 浜у搧鐪熺浉锛歔PRODUCT.md](../../PRODUCT.md)
- 瑙嗚绯荤粺锛歔DESIGN.md](../../DESIGN.md)锛堝喎鐏扮敾甯?+ 闈掔豢寮鸿皟锛涗寒/鏆?token 钀藉湴浜?`src/style.css`锛涙墜鍔ㄤ富棰?+ View Transition 鍦嗗舰鎻ず锛?

## 涓婚

- 鍒囨崲锛歚ThemeToggle` 鈫?`useThemeToggle`锛圴ueUse `useDark`锛岄敭 `lcd-color-scheme`锛?- 鏆楄壊閫夋嫨鍣細`html.dark`锛坄index.html` FOUC 鑴氭湰涓庝箣瀵归綈锛?- 鍔ㄧ敾锛歚document.startViewTransition`+`clip-path` 鍦嗗舰鎻ず锛涙棤 API / 鍑忓皯鍔ㄦ晥鏃剁灛鏃跺垏鎹?- 鍗曟祴锛歚src/composables/useThemeToggle.test.ts`锛堝瓨鍌ㄩ敭涓庢彮绀哄崐寰勶級

## 褰撳墠鐘舵€侊紙V0.1 UI 宸插畬鎴愶細M4 / M5 / M6锛?

| 鏂囦欢                               | 鑱岃矗                                                                                                                                           |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/style.css`                      | 璁捐 token锛堜寒鑹?`:root` / 鏆楄壊 `html.dark`锛変笌 `.ui-panel` / `.ui-btn` / View Transition 鏍峰紡                                          |
| `src/composables/useThemeToggle.ts`  | `useDark` + View Transitions 鍦嗗舰鎻ず锛涘瓨鍌ㄩ敭 `lcd-color-scheme`                                                                          |
| `src/components/ThemeToggle.vue`     | 椤电湁浜?鏆楀垏鎹㈡寜閽紙澶槼/鏈堜寒锛?                                                                                                        |
| `src/components/JsonEditor.vue`      | 鍗曟爮 CodeMirror 6锛坄basicSetup`+ JSON + CSS 鍙橀噺涓婚锛岄殢`html.dark` 鍚屾锛?                                                             |
| `src/components/JsonInputArea.vue`   | TEST/PROD 鍙屾爮銆佸鍏?鏍煎紡鍖?娓呯┖銆乂alid 鎬併€併€屽紑濮?Diff銆嶉棬绂侊紱`emit('start-diff', { test, prod })`                               |
| `src/composables/useJsonDocument.ts` | 绾牎楠?鏍煎紡鍖栵細`evaluateJsonDocument` / `formatJsonDocument`锛堝鐢?M1 `parseConfig` / `formatConfig`锛?                                    |
| `src/composables/diffTreeModel.ts`   | 绾嚱鏁帮細`buildDiffTree` 缁勬爲锛沗withSide`/`withAllSides`/`withDefaultSides`/`withDescendantSides`锛沗sideStateForPrefix` 娣峰悎鎬?          |
| `src/stores/diffSession.ts`          | Pinia锛歚startSession` 鈫?`diffConfig`锛涙寔鏈?test/prod銆佸彲鏀?`leaves`銆乣showUnchanged`锛涙壒閲忛€夎竟 API 渚?DiffTree / MergePreview 璇诲彇 |
| `src/components/DiffTree.vue`        | Diff 鏍?UI锛氫粎宸紓榛樿銆佹樉绀烘棤宸紓寮€鍏炽€佸彾閫夎竟銆佺埗绾ф壒閲忋€佸叏閮?TEST/PROD/鎭㈠榛樿锛涜涔夎壊寰界珷                        |
| `src/utils/exportConfig.ts`          | 绾伐鍏凤細`summarizeMergeSides` / `buildMergeSummaryText` / `copyText` / `downloadJsonFile`锛堜笅杞藉浐瀹?`config.json`锛?                      |
| `src/components/MergePreview.vue`    | 璇?session锛歚mergeConfig`+`formatConfig` 瀹炴椂棰勮锛涙憳瑕侊紱澶嶅埗 / 涓嬭浇锛涙棤 session 鏃跺崰浣?                                         |
| `src/views/HomeView.vue`             | 涓夊尯闈㈡澘锛氳緭鍏?鈫?宸紓 鈫?缁撴灉锛涢〉鐪変富棰樺垏鎹紱`start-diff` 鈫?`diffSession.startSession`                                         |

### 杈撳叆鍖猴紙M4锛?

鏍￠獙鐘舵€侊細`empty` | `valid` | `invalid`锛涢《灞傞』涓?object 鎴?array銆備袱渚у潎 `valid` 鎵嶅彲鐐广€屽紑濮?Diff銆嶃€傜敤鎴?JSON 涓嶄笂浼犮€佷笉鎸佷箙鍖栥€?
鍗曟祴锛歚src/composables/useJsonDocument.test.ts`锛堜笉瀵?CM6 鍋氳剢寮?DOM 鍗曟祴锛夈€?

### Diff 鏍戯紙M5锛?

- 榛樿鍙覆鏌撳樊寮傚彾鍙婂叾绁栧厛瀹瑰櫒锛涖€屾樉绀烘棤宸紓銆嶅紑鍚悗鐩稿悓鑺傜偣涓?`equal`锛堝彧璇汇€佹棤閫夎竟锛夛紝涓嶈繘鍏?merge 鍙跺瓙鍒楄〃銆?- 榛樿 side锛歚modified`/`added` 鈫?`test`锛沗removed` 鈫?`prod`锛堝紩鎿庝骇鍑猴紱鎭㈠榛樿鎸?type 閲嶇畻锛夈€?- `diffSession.leaves` 浜ょ粰 `mergeConfig`锛堢敱 MergePreview 璋冪敤锛夈€?
  鍗曟祴锛歚src/composables/diffTreeModel.test.ts`銆?

### 鍚堝苟棰勮涓庡鍑猴紙M6锛?

- 閫夎竟鍙樺寲鏃?`MergePreview` 鐢?`mergeConfig(test, prod, leaves)` 鍗虫椂鏇存柊锛涢瑙堜负 `formatConfig` 鏂囨湰锛坄<pre>`锛夈€?- 鎽樿鏂囨鐢?`buildMergeSummaryText`锛涘鍒?/ 涓嬭浇鍐呭涓虹函 JSON锛屾棤 metadata锛涗笉鍐?localStorage銆?
鍗曟祴锛歚src/utils/exportConfig.test.ts`锛堟憳瑕佺函鍑芥暟锛涗笉瀵?clipboard/DOM 鍋氳剢寮卞崟娴嬶級銆?

## 瑙勬牸涓庤鍒?

- 瑙勬牸锛歔M4](../specs/2026-08-15-m4-ui-json-input.md)銆乕M5](../specs/2026-08-15-m5-ui-diff-tree.md)銆乕M6](../specs/2026-08-15-m6-ui-merge-export.md)
- 璁″垝锛堝凡褰掓。锛夛細[M4](../plans/archive/2026-08-15-m4-ui-json-input.md)銆乕M5](../plans/archive/2026-08-15-m5-ui-diff-tree.md)銆乕M6](../plans/archive/2026-08-15-m6-ui-merge-export.md)

## V0.1 UI

V0.1 UI 涓昏矾寰勫凡瀹屾垚锛堣緭鍏?鈫?Diff 閫夎竟 鈫?鍚堝苟棰勮 / 澶嶅埗涓嬭浇锛夈€?
