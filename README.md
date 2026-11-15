# みんなで管理

マンションの自主管理シフトと報酬シェアの試作品です。ゴミ出しや立ち会いの担当を住人で分け、回数に応じた報酬を見ます。

公開サイトは https://minnade-kanri.vercel.app です。画面の見方と操作は [docs/使い方.md](./docs/使い方.md) にまとめています。仕様は [SPEC.md](./SPEC.md) です。

## 起動

```bash
npm install
npm run dev
```

ブラウザで http://localhost:3000 を開きます。合言葉は `1234` です。データはそのブラウザの localStorage に保存され、別の端末とは共有されません。
