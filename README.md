# Postra

Socialt nätverk byggt med Test-Driven Development (TDD), Clean Code-principer och vidareutvecklat till en mer komplett social plattform med moderna funktioner, bättre säkerhet och ett uppdaterat gränssnitt.

## 📋 Projektöversikt

Detta projekt började som en kurs- och kompletteringsuppgift men har därefter byggts ut betydligt. Den nuvarande appen heter **Postra** och innehåller både klassiska sociala funktioner och senare tillägg som mediauppladdning, realtidsnotiser, sparade inlägg, reposts, kommentarer, förbättrade direktmeddelanden och responsivt theme-system.

Projektet fokuserar på:
- Test-Driven Development (TDD)
- Clean Code-principer och tydlig lagerindelning
- Verifiering, testmetoder och dokumenterad kvalitet
- Säker autentisering och skyddad API-kommunikation
- Fortsatt produktutveckling i ett verkligare fullstack-flöde

## Grupp-DMs Och Samtal MVP

Den nuvarande MVP-versionen innehåller nu även den första fungerande leveransen för gruppkonversationer och samtal:

- Gruppkonversationer med medlemskap, meddelanden och systemmeddelanden
- Grundläggande SignalR-baserad samtalssignaling för direkt- och gruppkonversationer
- MVP-flöden för röstsamtal och videosamtal i klienten
- Enkel stabilisering för frånkoppling, återanslutning, stale call sessions och duplicerade WebRTC-svar

Det här motsvarar i praktiken dag 1-7 i den ursprungliga grovplanen: design, backendgrund, grupp-DMs, signaling, röst/video-MVP samt en första stabiliserings- och dokumentationsomgång.

## 🏗️ Teknisk Stack

- **Front-end**: React 18, React Router, SignalR-klient
- **Back-end**: .NET 9.0 Web API
- **Databas**: SQL Server med Entity Framework Core
- **Validering**: FluentValidation
- **Realtid**: SignalR
- **Autentisering**: JWT + BCrypt för lösenordshashning
- **Testning**: xUnit, Moq, FluentAssertions
- **Versionshantering**: Git + GitHub
- **CI/CD**: GitHub Actions

## 📦 Projektstruktur

```text
SocialTDD/
├── backend/
│   ├── SocialTDD.Api/              # Web API controllers, Program.cs, Swagger, auth, SignalR
│   ├── SocialTDD.Application/      # Business logic, services, DTOs, validators, interfaces
│   ├── SocialTDD.Domain/           # Domain entities och affärsmodeller
│   ├── SocialTDD.Infrastructure/   # Repositories, EF Core, migrations, persistence
│   └── SocialTDD.Tests/            # Unit tests för services och centrala flöden
├── frontend/                       # React-applikationen för Postra
│   ├── src/
│   │   ├── components/             # UI-komponenter för feed, profiler, DM, notiser m.m.
│   │   ├── contexts/               # AuthContext, ThemeContext
│   │   ├── services/               # API-anrop och SignalR/realtime-klienter
│   │   └── utils/                  # Hjälpfunktioner
│   └── public/                     # Statiska filer
├── CoverageReport/                 # Coverage-rapporter (genereras)
├── STATIC_CODE_ANALYSIS.md         # Dokumenterad statisk kodanalys
├── TEST_COVERAGE.md                # Dokumenterad coverage
└── SocialTDD.sln
```

## 🚀 Setup

### Förutsättningar

- **.NET 9.0 SDK** - [Ladda ner här](https://dotnet.microsoft.com/download)
- **Node.js** (18 eller senare rekommenderas) - [Ladda ner här](https://nodejs.org/)
- **npm**
- **SQL Server LocalDB** eller annan SQL Server-instans
- **Git**

### Starta Projektet

#### Backend

1. **Restore dependencies** (från projektets rot):
	```bash
	dotnet restore
	```
	> **OBS:** Kommandot körs från projektets rot-katalog och restore:ar alla .NET-projekt automatiskt.

2. **Konfigurera backend** i `backend/SocialTDD.Api/appsettings.json` och/eller `backend/SocialTDD.Api/appsettings.Development.json`.
	Kontrollera särskilt:
	```json
	{
	  "ConnectionStrings": {
		 "DefaultConnection": "Server=(localdb)\\mssqllocaldb;Database=SocialTDD;Trusted_Connection=true;MultipleActiveResultSets=true"
	  },
	  "Jwt": {
		 "Issuer": "...",
		 "Audience": "..."
	  },
	  "Cors": {
		 "AllowedOrigins": ["http://localhost:3000"]
	  }
	}
	```
	> **OBS:** `Jwt:Secret` ska sättas via user secrets eller miljövariabler, inte via en osäker hårdkodad standardhemlighet.
	> **OBS:** Global GIF-sökning använder en backend-proxy. Sätt därför `Giphy:ApiKey` via user secrets eller miljövariabler på serversidan, inte i frontend.

3. **Kör migrations** för att skapa eller uppdatera databasen:
	```bash
	dotnet ef database update --project backend/SocialTDD.Infrastructure --startup-project backend/SocialTDD.Api
	```

4. **Starta API:**
	```bash
	dotnet run --project backend/SocialTDD.Api
	```

	API:et körs normalt på `http://localhost:5000`
   
	Swagger UI finns på `http://localhost:5000/swagger`
   
	SignalR-hubben för notiser finns på `http://localhost:5000/hubs/notifications`

#### Frontend

1. **Installera dependencies:**
	```bash
	npm --prefix frontend install
	```

2. **Frontend kräver ingen egen GIF-nyckel.**
	```bash
	copy frontend\.env.example frontend\.env
	```
	Filen finns nu bara som lokal frontend-mall. Själva GIF-sökningen hämtas via backend.

3. **Starta utvecklingsserver:**
	```bash
	npm --prefix frontend start
	```

	Frontend öppnas normalt på `http://localhost:3000`

4. **Alternativ: starta båda från repo-roten**
	```bash
	npm start
	```

### Felsökning

**Problem med databas:**
- Kontrollera att SQL Server LocalDB eller din SQL Server-instans är igång
- Verifiera connection string i `appsettings.json`
- Kör migrations igen om databasen saknas eller är inaktuell

**Problem med JWT / auth:**
- Kontrollera att `Jwt:Secret` är satt korrekt via user secrets eller environment variables
- Kontrollera att issuer och audience matchar backend-konfigurationen

**Problem med portar:**
- Backend-port 5000 kan vara upptagen av en tidigare process
- Frontend-port 3000 kan automatiskt bytas om den redan används

**Problem med GIF-sökning:**
- Kontrollera att backend har `Giphy:ApiKey` satt via user secrets eller environment variables
- Starta om backend efter att du lagt till eller ändrat serverns GIPHY-nyckel
- Om servernyckeln saknas visas GIF-knappen fortfarande, men sökpanelen kan inte ladda globala GIF-resultat

## 🧪 Testning

### Backend-tester

```bash
dotnet test SocialTDD.sln --no-restore
```

**Senaste lokala testresultat (31 maj 2026):**
- ✅ **103 tester passerar**
- ❌ **0 tester misslyckas**
- ⏭️ **0 tester hoppades över**
- ⏱️ **Total tid: cirka 26 sekunder**
- 📦 **Totalt antal tester: 103**

Den senaste backend-testkörningen i arbetsomgången passerade fullt ut och inkluderar nu även utökade tester för `ConversationService`, bland annat gruppskapande, medlemsvalidering, gruppnotifieringar och åtkomstkontroll.

### Coverage-rapport

Generera coverage-rapport lokalt:

```bash
# Kör tester med coverage
dotnet test --configuration Release --collect:"XPlat Code Coverage" --results-directory:"./TestResults" -- DataCollectionRunSettings.DataCollectors.DataCollector.Configuration.Format=cobertura

# Generera HTML-rapport
dotnet tool install -g dotnet-reportgenerator-globaltool
reportgenerator -reports:"./TestResults/**/coverage.cobertura.xml" -targetdir:"./CoverageReport" -reporttypes:"Html;Badges;TextSummary"
```

Öppna `./CoverageReport/index.html` för detaljerad coverage-rapport.

Se [TEST_COVERAGE.md](TEST_COVERAGE.md) för detaljerad dokumentation.

### Frontend-tester

```bash
npm --prefix frontend test
```

### Frontend-build

```bash
npm --prefix frontend run build
```

Den senaste frontend-builden i denna arbetsomgång kompilerade korrekt.

### Senaste dag 7-verifiering

Följande verifieringar kördes i stabiliseringsomgången den 31 maj 2026:

- `dotnet test SocialTDD.sln --no-restore` → 103/103 tester gröna
- `dotnet test backend/SocialTDD.Tests/SocialTDD.Tests.csproj --filter ConversationServiceTests` → 5/5 tester gröna
- `npm --prefix frontend run build` → kompilerade korrekt

## 📊 Statisk Kodanalys

Projektet använder .NET analyzers för statisk kodanalys. Se [STATIC_CODE_ANALYSIS.md](STATIC_CODE_ANALYSIS.md) för detaljerad dokumentation.

**Senast dokumenterad analysstatus:**
- ✅ **0 warnings**
- ✅ **0 errors**
- ✅ **.NET analyzers aktiverade i build**

## 📚 Dokumentation

- [Statisk Kodanalys](STATIC_CODE_ANALYSIS.md) - Dokumentation av kodanalys och resultat
- [Test Coverage](TEST_COVERAGE.md) - Dokumentation av test coverage och resultat

### Ytterligare dokumentation

- **Swagger UI**: `http://localhost:5000/swagger` (när backend körs)
- **Coverage-rapport**: `./CoverageReport/index.html` (genereras efter testkörning)

## 🔐 Autentisering

API:et använder JWT-autentisering. Endpoints är skyddade med `[Authorize]` där autentisering krävs.

Säkerhetsförbättringar som finns i nuvarande app:
- JWT-secret måste konfigureras säkert
- lösenord hash:as med BCrypt
- CORS är explicit konfigurerat
- mediauppladdningar valideras för filtyp och storlek
- direktmeddelanden och skyddade resurser kräver autentisering

### API Endpoints

**Autentisering (publika):**
- `POST /api/auth/register` - Registrera ny användare
- `POST /api/auth/login` - Logga in och få JWT token

**Användare (kräver autentisering):**
- `GET /api/user/{userId}` - Hämta användare efter ID
- `GET /api/user/username/{username}` - Hämta användare efter användarnamn
- `GET /api/user/search?query={query}` - Sök efter användare

**Inlägg (kräver autentisering):**
- `POST /api/posts` - Skapa nytt inlägg med text och valfri media
- `GET /api/posts/timeline/{userId}` - Hämta tidslinje för användare
- `POST /api/posts/{postId}/comments` - Skapa kommentar
- `PUT /api/posts/{postId}/comments/{commentId}` - Redigera kommentar
- `DELETE /api/posts/{postId}/comments/{commentId}` - Ta bort kommentar
- `POST /api/posts/{postId}/bookmark` - Spara inlägg
- `DELETE /api/posts/{postId}/bookmark` - Ta bort sparat inlägg
- `POST /api/posts/{postId}/repost` - Reposta inlägg
- `DELETE /api/posts/{postId}/repost` - Ta bort repost

**Följare (kräver autentisering):**
- `POST /api/follow` - Följ en användare
- `DELETE /api/follow/{followingId}` - Avfölj en användare
- `GET /api/follow/followers/{userId}` - Hämta följare
- `GET /api/follow/following/{userId}` - Hämta följda användare

**Vägg och notifieringar (kräver autentisering):**
- `GET /api/wall` - Hämta aggregat-flöde från följda användare
- `GET /api/notifications` - Hämta notifikationer
- `GET /api/notifications/unread-count` - Hämta antal olästa notiser

**Direktmeddelanden (kräver autentisering):**
- `POST /api/directmessages` - Skicka direktmeddelande med text eller media
- `GET /api/directmessages/received` - Hämta mottagna meddelanden
- `GET /api/directmessages/conversation/{otherUserId}` - Hämta konversation mellan två användare
- `PUT /api/directmessages/{messageId}/read` - Markera meddelande som läst

### Swagger UI

När backend körs kan du använda Swagger UI för att testa API:et:
- Öppna `http://localhost:5000/swagger` i webbläsaren
- Logga in via `/api/auth/login` för att få JWT token
- Klicka på `Authorize` och ange token som `Bearer {din-token}`

## 📝 Funktionalitet

Det här är inte längre bara den ursprungliga "Socially"-appen. Följande funktionalitet är nu implementerad eller kraftigt utbyggd i Postra:

1. ✅ **Autentisering och konton**
	- Registrering och inloggning med JWT
	- Stark lösenordspolicy
	- Säker lösenordshashning med BCrypt

2. ✅ **Profiler och användare**
	- Offentliga profiler
	- Sökning efter användare
	- Uppdatering av profilinformation och profilbild

3. ✅ **Timeline, wall och socialt nätverk**
	- Personlig tidslinje
	- Aggregat-wall från följda användare
	- Följare/following-flöden
	- Network-sida för upptäckt av användare

4. ✅ **Inlägg med media**
	- Skapa textinlägg
	- Ladda upp bild eller video i inlägg
	- Media renderas i feeden
	- Filtyper och storlekar valideras

5. ✅ **Interaktioner på inlägg**
	- Likes
	- Kommentarer
	- Redigera och ta bort kommentarer
	- Bookmarks/sparade inlägg
	- Reposts

6. ✅ **Hashtags och mentions**
	- Hashtag-stöd i skapande och rendering
	- Mention-flöden och notisrelaterad logik

7. ✅ **Direktmeddelanden (DM)**
	- Skicka och ta emot DM
	- Stöd för text och media
	- Konversationsvy
	- Läskvittenser

8. ✅ **Notifikationer och realtime**
	- Notissida
	- Oljästa notiser
	- SignalR-baserade realtidsuppdateringar
	- Toast-notiser i frontend

9. ✅ **Modernare UI/UX**
	- Postra-branding
	- Light mode / dark mode
	- Responsiv navigation
	- Förbättrad sidebar och dashboard-layout
	- Förbättrat auth-gränssnitt och visuella effekter

10. ✅ **Persistens**
	- All data sparas i SQL Server
	- Entity Framework Core migrations används för databasschema

## 📊 Test Coverage

Senast dokumenterad coverage enligt [TEST_COVERAGE.md](TEST_COVERAGE.md):

- **Application Layer**: 95.6% coverage ✅
- **Domain Layer**: 84.6% coverage ✅
- **Line coverage**: 28.8%
- **Branch coverage**: 74.4%
- **Method coverage**: 59.8%
- Coverage-rapporter genereras automatiskt i CI/CD och lokalt via ReportGenerator

## 🛠️ Utveckling

### Bygga projektet

```bash
# Bygg hela lösningen
dotnet build SocialTDD.sln

# Bygg frontend
npm --prefix frontend run build
```

### Kör alla tester

```bash
# Backend-tester
dotnet test SocialTDD.sln --no-restore

# Frontend-tester
npm --prefix frontend test
```

### Generera coverage-rapport

```bash
# Kör tester med coverage
dotnet test --configuration Release --collect:"XPlat Code Coverage" --results-directory:"./TestResults" -- DataCollectionRunSettings.DataCollectors.DataCollector.Configuration.Format=cobertura

# Generera HTML-rapport (kräver dotnet-reportgenerator-globaltool)
dotnet tool install -g dotnet-reportgenerator-globaltool
reportgenerator -reports:"./TestResults/**/coverage.cobertura.xml" -targetdir:"./CoverageReport" -reporttypes:"Html;Badges;TextSummary"
```

## 📄 Licens

Projektet används som skol- och utvecklingsprojekt. Ingen separat licens har lagts till i repot.
