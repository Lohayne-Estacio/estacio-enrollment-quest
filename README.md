# Estacio Enrollment Quest

Crie um web app mobile-first chamado "Simulador do Consultor – Modo Game", para consultores comerciais da Estácio (regional Centro Sul). Recrie FIELMENTE o arquivo HTML que vou anexar: mesmas regras de cálculo, textos, telas e visual. Não invente nem altere regras.

Regras (PGE.05.235):

- Valor por MF conforme faixa de atingimento total (sem teto acima de 200%):

  Faixas 0–49,99 | 50–79,99 | 80–99,99 | 100–119,99 | 120–149,99 | 150–199,99 | 200+

  Presencial: 20/40/56/80/96/112/128

  Semipresencial: 15/30/42/60/72/84/96

  Ao vivo: 10/20/28/40/48/56/64

  EAD: 9/18/25/35/42/49/56

  Med. Vet. Presencial e Odonto: 50/100/140/200/240/280/320

- Med. Vet. Semi paga como Semipresencial. Psicologia, Enfermagem e Direito são presenciais: o +1 deles soma também no Presencial.

- Bônus de núcleo (só com 100%+ individual): +5% com núcleo de 100 a 109,99%; +10% com núcleo em 110%+.

- Pagamento: 60% antecipação + 40% saldo no fim da captação (sujeito à conversão), sobre o total com bônus.

- RVV de pós (PGE.05.008): múltiplo do salário-base por faixa: <80% 0; 80–89,99 0,05; 90–99,99 0,15; 100–119,99 0,20; 120%+ 0,25.

Funcionalidades: tutorial de primeiro acesso, avatar com foto ou emoji, seletor dos 11 núcleos, painéis Graduação/Pós/Núcleo com botões +1, som de caixa registradora, chuva de dólares ao subir de nível, missões em R$, Radar do ganho, resumo 1:1 para WhatsApp, zerar números e virada automática do mês.

Dados salvos só no aparelho do usuário (localStorage), sem login e sem banco de dados.

Paleta: #ffffff, #009abf, #1baebe, #262a4d, #000000. Manter o aviso legal do rodapé exatamente como no arquivo.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://estacio-enrollment-quest.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/19da053d-0e84-4064-844d-f162574f2cdf).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
