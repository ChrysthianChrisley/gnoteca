# Gnoteca

Gnoteca e uma plataforma minimalista de registro, compartilhamento e contemplacao de pensamentos, aforismos e ideias filosoficas. O projeto foi concebido para ser uma rede social centrada nas ideias e no conhecimento, e nao no culto a personalidade ou em metricas superficiais de vaidade.

---

## Indice

- [Visao Geral](#visao-geral)
- [Tecnologias Utilizadas](#tecnologias-utilizadas)
- [Funcionalidades Implementadas](#funcionalidades-implementadas)
- [Modelo de Dados e Seguranca (Supabase)](#modelo-de-dados-e-seguranca-supabase)
- [Regras de Escassez e Moderacao](#regras-de-escassez-e-moderacao)
- [Instalacao e Execucao Local](#instalacao-e-execucao-local)
- [Como Configurar o Banco de Dados no Supabase](#como-configurar-o-banco-de-dados-no-supabase)
- [Estrutura de Arquivos](#estrutura-de-arquivos)
- [Roteiro Futuro (Roadmap)](#roteiro-futuro-roadmap)

---

## Visao Geral

Diferente das redes sociais convencionais que priorizam o engajamento desenfreado e algoritmos de dopamina, a Gnoteca opera sob o principio da escassez consciente e do valor intrinseco das ideias:

- Cada fragmento possui limite de 280 caracteres para estimular sintese e clareza.
- Votos diarios limitados para incentivar a ponderacao antes de apoiar ou criticar uma ideia.
- Favoritos estritamente limitados a 3 pilares por pensador, formando uma constelacao representativa de sua mente.
- Design editorial que remete a uma biblioteca classica digital, com foco total na legibilidade.

---

## Tecnologias Utilizadas

- **Frontend**: HTML5 Semantico, CSS3 Moderno (Custom Properties, Flexbox, Grid, Glassmorphism) e Vanilla JavaScript (ES6+).
- **Backend as a Service**: Supabase (PostgreSQL, Row Level Security, Triggers em PL/pgSQL).
- **Autenticacao**: Supabase Auth com suporte a provedor OAuth (Google) e autenticacao tradicional por E-mail/Senha.
- **Tipografia**: Google Fonts (Cinzel para a marca e titulos, Lora para o corpo dos pensamentos, Plus Jakarta Sans para controles de interface).
- **Internacionalizacao**: Sistema nativo de traducao em tempo de execucao (Portugues, Ingles e Espanhol).

---

## Funcionalidades Implementadas

### 1. Autenticacao e Identidade
- Login social com Google OAuth e cadastro tradicional por e-mail e senha.
- Captura automatica e sincronizacao da foto de perfil (`avatar_url`) para usuarios autenticados via Google.
- Fallback elegante para iniciais do usuario caso nao possua imagem de perfil.
- Modal de autenticacao integrado e barra lateral limpa de opcoes.

### 2. Gestao de Fragmentos (Pensamentos)
- Publicacao de fragmentos em tempo real diretamente na tabela `entries` do Supabase.
- Feed publico aberto para visualizacao mesmo sem autenticacao.
- Modos de visualizacao do feed:
  - **Acervo Publico**: Ultimos fragmentos publicados por toda a comunidade.
  - **Meu Acervo**: Fragmentos publicados pelo proprio usuario autenticado.
  - **Favoritos**: Apenas as ideias salvas pelo usuario.
  - **Perfil do Pensador**: Vista dedicada aos fragmentos e constelacao de um autor especifico.
- Ordenacao dinamica: Mais novas, Mais votadas e Mais favoritas.
- Edicao e exclusao de entradas exclusivas para o autor original, protegidas no cliente e por politicas RLS no banco de dados.
- Sanitizacao completa de texto (`escapeHTML`) para protecao contra ataques de Cross-Site Scripting (XSS).

### 3. Sistema de Votos e Escassez Diaria
- Votos de concordancia (upvote) e discordancia (downvote) persistidos na tabela `votes`.
- Limite maximo de 5 votos por dia por usuario.
- Capacidade de alternar o sentido do voto ou remover um voto existente sem penalidade ou consumo de cotas adicionais.

### 4. Constelacao de 3 Favoritos (Triptico Filosofico)
- Limite maximo de 3 favoritos ativos por usuario.
- No perfil de cada pensador, e renderizada a **Constelacao de Pensamentos**, destacando os 3 fragmentos que o guiam (Pilares I, II e III).
- Slots vazios estilizados informam quando a constelacao do pensador ainda possui vagas abertas.
- Indicador de progresso na barra lateral (exemplo: `2/3 favoritos`).

### 5. Design e Experiencia de Usuario
- Alternancia de Modo Claro (Light Mode) e Modo Noturno (Dark Mode) com persistencia local via `localStorage`.
- Tipografia serifada de alta legibilidade para o texto dos pensamentos.
- Microinteracoes, elevacao suave de cartoes ao passar o cursor e notificacoes contextuais integradas.

---

## Modelo de Dados e Seguranca (Supabase)

O banco de dados relacional e composto por quatro tabelas principais com Row Level Security (RLS) habilitado:

1. **`public.profiles`**:
   - `id` (UUID, chave primaria vinculada a `auth.users`).
   - `username` (Texto unico).
   - `display_name` (Nome de exibicao).
   - `avatar_url` (URL da foto de perfil).
   - `created_at` (Timestamp).

2. **`public.entries`**:
   - `id` (BigInt gerado automaticamente).
   - `author_id` (UUID vinculado a `public.profiles.id`).
   - `content` (Texto entre 1 e 280 caracteres).
   - `created_at` (Timestamp).

3. **`public.votes`**:
   - `entry_id` (BigInt vinculado a `public.entries.id`).
   - `user_id` (UUID vinculado a `public.profiles.id`).
   - `vote_type` (`up` ou `down`).
   - `created_at` (Timestamp).
   - Chave primaria composta: `(entry_id, user_id)`.

4. **`public.favorites`**:
   - `entry_id` (BigInt vinculado a `public.entries.id`).
   - `user_id` (UUID vinculado a `public.profiles.id`).
   - `created_at` (Timestamp).
   - Chave primaria composta: `(entry_id, user_id)`.

---

## Regras de Escassez e Moderacao

As regras de negocio estao protegidas em duas camadas:

1. **Camada de Aplicacao (`app.js`)**:
   - Bloqueio imediato na interface com mensagens de aviso antes do envio da requisicao.
2. **Camada de Banco de Dados (`supabase-schema.sql`)**:
   - `enforce_max_favorites`: Impede que qualquer insercao ultrapasse 3 registros na tabela `favorites` por usuario.
   - `enforce_max_daily_votes`: Impede mais de 5 insercoes diarias na tabela `votes` por usuario no mesmo dia (`date_trunc('day', now())`).
   - `handle_new_user`: Cria automaticamente o perfil publico quando um novo usuario se registra no Supabase Auth.

---

## Instalacao e Execucao Local

Por ser uma aplicacao puramente estatica, nao e necessario compilar ou instalar dependencias pesadas:

1. Clone o repositorio:
```bash
git clone https://github.com/ChrysthianChrisley/gnoteca.git
cd gnoteca
```

2. Execute um servidor HTTP local simples (exemplos):
- Com Node.js / npx:
```bash
npx serve .
```
- Com Python 3:
```bash
python -m http.server 3000
```

3. Acesse `http://localhost:3000` no seu navegador.

---

## Como Configurar o Banco de Dados no Supabase

1. Crie um projeto gratuito no [Supabase](https://supabase.com).
2. Acesse o menu lateral esquerdo e clique em **SQL Editor**.
3. Clique em **New query**.
4. Copie todo o conteudo do arquivo `supabase-schema.sql` deste repositorio e cole no editor.
5. Clique em **Run** para executar o script.
6. Em **Authentication > Providers**, ative os provedores desejados (Email e Google).
7. Caso utilize um projeto proprio, atualize a URL e a Publishable Key no topo do arquivo `app.js`.

---

## Estrutura de Arquivos

```
gnoteca/
|-- index.html            # Estrutura semantica principal e modais
|-- style.css             # Folha de estilos, tokens de design, modo escuro e responsividade
|-- app.js                # Logica de aplicacao, chamadas ao Supabase SDK, rotas e internacionalizacao
|-- supabase-schema.sql   # Script SQL idempotente com tabelas, RLS, politicas e triggers
|-- README.md             # Documentacao central do projeto
```

---

## Roteiro Futuro (Roadmap)

Planejamento para as proximas versoes da Gnoteca:

- **Veu da Ignorancia (Avaliacao Cega)**: Opcao no feed para ocultar a autoria dos fragmentos no primeiro contato, revelando apenas apos a leitura e reflexao.
- **Fios Dialeticos (Tese e Antitese)**: Conexao estruturada entre fragmentos que representam contrapontos ou desdobramentos de outras ideias.
- **Reacoes Qualitativas**: Classificacao conceitual alem do voto binario (exemplo: Revelador, Provocativo, Lapidado).
- **Simposio Diario**: Topico ou questao filosofica do dia proposta coletivamente para debates concentrados.
- **Canone da Gnoteca**: Secao historica para ideias atemporais que continuam sendo revisitadas ao longo dos anos.
