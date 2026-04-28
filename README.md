# Socially

Socialt nätverk byggt med Test-Driven Development (TDD) och Clean Code-principer.

## 📋 Projektöversikt

Detta projekt är en kompletteringsuppgift för kursen och implementerar en social nätverksapplikation med fokus på:
- Test-Driven Development (TDD)
- Clean Code-principer (Robert C. Martin)
- Verifiering & testmetoder
- Versionshantering & projektarbete

## 🏗️ Teknisk Stack

- **Front-end**: React
- **Back-end**: .NET 9.0 Web API
- **Databas**: SQL Server (Entity Framework Core)
- **Versionshantering**: Git + Git Flow
- **CI/CD**: GitHub Actions

## 📦 Projektstruktur

```
SocialTDD/
├── backend/
│   ├── SocialTDD.Api/              # Web API controllers, Program.cs
│   ├── SocialTDD.Application/      # Business logic, services, DTOs, validators
│   ├── SocialTDD.Domain/           # Domain entities (User, Post, Follow, DirectMessage)
│   ├── SocialTDD.Infrastructure/   # Data access, repositories, EF Core migrations
│   └── SocialTDD.Tests/            # Unit tests för alla services
├── frontend/                       # React application
│   ├── src/
│   │   ├── components/            # React-komponenter
│   │   ├── contexts/              # React contexts (AuthContext)
│   │   ├── services/               # API-anrop
│   │   └── utils/                  # Hjälpfunktioner
│   └── public/                     # Statiska filer
├── CoverageReport/                 # Test coverage-rapporter (genereras)
└── .github/workflows/              # CI/CD pipelines
```

## 🚀 Setup

### Förutsättningar

- **.NET 9.0 SDK** - [Ladda ner här](https://dotnet.microsoft.com/download)
- **Node.js** (v16 eller senare) - [Ladda ner här](https://nodejs.org/)
- **SQL Server LocalDB** - Inkluderas med Visual Studio eller installera separat
- **Git** - För versionshantering

### Starta Projektet

#### Backend

1. **Restore dependencies** (från projektets rot):
   ```bash
   dotnet restore
   ```
   > **OBS:** Kommandot körs från projektets rot-katalog och restore:ar alla .NET-projekt automatiskt.

2. **Konfigurera databas** i `backend/SocialTDD.Api/appsettings.json`:
   ```json
   {
     "ConnectionStrings": {
       "DefaultConnection": "Server=(localdb)\\mssqllocaldb;Database=SocialTDD;Trusted_Connection=true;MultipleActiveResultSets=true"
     }
   }
   ```
   > **OBS:** SQL Server LocalDB måste vara installerat och igång.

3. **Kör migrations** för att skapa databasen:
   ```bash
   dotnet ef database update --project backend/SocialTDD.Infrastructure --startup-project backend/SocialTDD.Api
   ```
   > **OBS:** Kommandot körs från projektets rot-katalog.

4. **Starta API:**
   ```bash
   dotnet run --project backend/SocialTDD.Api
   ```
   > **OBS:** Kommandot körs från projektets rot-katalog. `dotnet run` kommer automatiskt att restore:a dependencies om det behövs.
   
   API:et körs på http://localhost:5000
   Swagger UI finns på http://localhost:5000/swagger
   
   > **Tips:** För att starta både backend och frontend samtidigt kan du använda två separata terminalfönster eller ett terminalverktyg som stödjer flera sessions.

#### Frontend

1. **Installera dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Starta utvecklingsserver:**
   ```bash
   npm start
   ```
   
   Frontend öppnas automatiskt på http://localhost:3000

### Felsökning

**Problem med databas:**
- Kontrollera att SQL Server LocalDB är installerat och igång
- Verifiera connection string i `appsettings.json`
- Kör migrations igen om databasen saknas

**Problem med portar:**
- Backend-port 5000: Ändra i `launchSettings.json` om porten är upptagen
- Frontend-port 3000: React frågar automatiskt om porten är upptagen

## 🧪 Testning

### Backend-tester

```bash
dotnet test
```

**Testresultat:**
- ✅ 72 tester passerar
- ❌ 0 tester misslyckades
- ⏱️ Total tid: ~1 sekund

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
cd frontend
npm test
```

## 📊 Statisk Kodanalys

Projektet använder .NET analyzers för statisk kodanalys. Se [STATIC_CODE_ANALYSIS.md](STATIC_CODE_ANALYSIS.md) för detaljerad dokumentation.

**Status**: ✅ Inga varningar eller fel

## 📚 Dokumentation

- [Statisk Kodanalys](STATIC_CODE_ANALYSIS.md) - Dokumentation av kodanalys och resultat
- [Test Coverage](TEST_COVERAGE.md) - Dokumentation av test coverage och resultat

### Ytterligare dokumentation

- **Swagger UI**: http://localhost:5000/swagger (när backend körs)
- **Coverage-rapport**: `./CoverageReport/index.html` (genereras efter testkörning)

## 🔐 Autentisering

API:et använder JWT-autentisering. Endpoints är skyddade med `[Authorize]` attribut.

### API Endpoints

**Autentisering (publika):**
- `POST /api/auth/register` - Registrera ny användare
- `POST /api/auth/login` - Logga in och få JWT token

**Användare (kräver autentisering):**
- `GET /api/user/{userId}` - Hämta användare efter ID
- `GET /api/user/username/{username}` - Hämta användare efter användarnamn
- `GET /api/user/search?query={query}` - Sök efter användare

**Inlägg (kräver autentisering):**
- `POST /api/posts` - Skapa nytt inlägg
- `GET /api/posts/timeline/{userId}` - Hämta tidslinje för användare

**Följare (kräver autentisering):**
- `POST /api/follow` - Följ en användare
- `DELETE /api/follow/{followingId}` - Avfölj en användare
- `GET /api/follow/followers/{userId}` - Hämta följare
- `GET /api/follow/following/{userId}` - Hämta följda användare

**Vägg (kräver autentisering):**
- `GET /api/wall` - Hämta aggregat-flöde från följda användare

**Direktmeddelanden (kräver autentisering):**
- `POST /api/directmessages` - Skicka direktmeddelande
- `GET /api/directmessages/received` - Hämta mottagna meddelanden
- `PUT /api/directmessages/{messageId}/read` - Markera meddelande som läst

### Swagger UI

När backend körs kan du använda Swagger UI för att testa API:et:
- Öppna http://localhost:5000/swagger i webbläsaren
- Logga in via `/api/auth/login` för att få JWT token
- Klicka på "Authorize" och ange token: `Bearer {din-token}`

## 📝 Funktionalitet

Alla krav från uppgiftsbeskrivningen är implementerade:

1. ✅ **Posta inlägg** - Användare kan publicera meddelanden på andra användares tidslinjer
   - Validering: avsändare, mottagare, meddelandelängd (1-500 tecken)
   
2. ✅ **Läsa tidslinje** - Användare kan se sina egna eller någon annans inlägg i kronologisk ordning
   - Sorteras efter datum (nyast först)
   
3. ✅ **Följa användare** - Användare kan följa andra användare
   - Lagras i relationstabell
   - Ömsesidiga följ-relationer tillåtna
   
4. ✅ **Vägg (aggregat-flöde)** - Användare ser en samlad feed baserad på alla de följer
   - Senaste inlägg visas överst
   - Testad med enhetstester
   
5. ✅ **Direktmeddelanden (DM)** - Skicka och ta emot DM mellan två användare
   - DM visas inte i vägg eller publika flöden
   - Möjlighet att markera meddelanden som lästa
   
6. ✅ **Persistens** - All data sparas i SQL Server
   - Data kvarstår efter session och restart
   - Entity Framework Core migrations för databasschema

## 📊 Test Coverage

- **72 tester** passerar
- **Application Layer**: 95.6% coverage ✅
- **Domain Layer**: 84.6% coverage ✅
- **Branch coverage**: 74.4%
- **Method coverage**: 59.8%
- Coverage-rapporter genereras automatiskt i CI/CD
- Se [TEST_COVERAGE.md](TEST_COVERAGE.md) för detaljerad dokumentation

## 🛠️ Utveckling

### Bygga projektet

```bash
# Bygg backend
cd backend
dotnet build

# Bygg frontend
cd frontend
npm run build
```

### Kör alla tester

```bash
# Backend-tester
dotnet test

# Frontend-tester
cd frontend
npm test
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

Detta projekt är en kursuppgift.