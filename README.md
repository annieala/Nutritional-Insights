# Nutritional Insights

An interactive dashboard for exploring the nutritional makeup of 7,806 recipes across five diet types (Dash, Keto, Mediterranean, Paleo, and Vegan).

**Live demo:** [https://nutritional-insights.azurestaticapps.net](https://white-sea-001c4090f.6.azurestaticapps.net)

[![Deployed on Azure](https://img.shields.io/badge/deployed%20on-Azure%20Static%20Web%20Apps-0078D4.svg)](https://YOUR-APP-NAME.azurestaticapps.net)
[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF.svg)](../../actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Features

- **Interactive charts** built with Chart.js: macronutrients by diet (bar), recipe distribution (pie), protein vs. carbs (scatter), and nutrient correlations (heatmap)
- **Filtering** by diet type, nutrient focus, and protein, carb, and fat ranges, with charts updating as you filter
- **Authentication** with Firebase (Google, GitHub, or email), optional TOTP two-factor authentication, and a demo mode
- **Role-based access control** (admin, user, viewer) and audit logging
- **CI/CD** with GitHub Actions deploying to Azure Static Web Apps

## Tech Stack

| Area | Tools |
|------|-------|
| Front end | HTML5, vanilla JavaScript, Tailwind CSS, Chart.js, Papa Parse |
| Auth | Firebase Authentication |
| Data processing | Python, pandas, seaborn, matplotlib |
| Cloud | Azure Static Web Apps, Azure Blob Storage (Azurite for local development) |
| DevOps | GitHub Actions, Docker |

## Run Locally

```bash
git clone https://github.com/annieala/Nutritional-Insights.git
cd Nutritional-Insights
python -m http.server 5500
```

Then open http://localhost:5500. The app needs a local server (not `file://`) because it loads the CSV with `fetch()`. Python isn't required for the app itself. Any static server works, such as `npx http-server` or VS Code's Live Server.

To regenerate the analysis charts (optional; use Python 3.11 or 3.12):

```bash
pip install pandas seaborn matplotlib
python data_analysis.py --csv All_Diets.csv --no-show
```

## Deployment

The site is hosted on Azure Static Web Apps and deployed by GitHub Actions:

- Pushing or merging to `main` deploys to the live site.
- Each pull request gets its own preview URL, which is removed when the pull request closes.
- Deployment uses GitHub OpenID Connect (short-lived tokens) instead of a stored credential.

Because the app is plain HTML and JavaScript, the workflow skips the build step:

```yaml
app_location: "/"
output_location: ""
skip_app_build: true
```

For Google or GitHub sign-in on the live site, add the `azurestaticapps.net` domain under Firebase Console → Authentication → Settings → Authorized domains.

## Contributing

```bash
git checkout main && git pull
git checkout -b feature/short-description
# make changes, then:
git add . && git commit -m "feat: describe the change"
git push -u origin feature/short-description
```

Open a pull request, test the preview URL, then merge. Branch prefixes: `feature/`, `fix/`, `chore/`, `docs/`, `test/`.

Keep secrets in a local `.env` file, which is listed in `.gitignore`. Never commit it.

## Project Structure

```
index.html              Main app
*.js                    Auth, RBAC, audit logging, and encryption modules
All_Diets.csv           Dataset (plus per-diet CSVs)
data_analysis.py        Statistical analysis and chart generation
lambda_function.py      Serverless data processing with Azure Blob Storage
.github/workflows/      CI/CD pipeline
```

## Key Findings

- Keto and Mediterranean recipes have the most protein (about 101 g on average); Vegan has the least (56 g).
- Vegan recipes average about 4.4 times the carbohydrates of Keto recipes.
- Keto has the highest fat content (153 g on average).

## Team

Built by Group 7 for the Software Development Diploma at SAIT (Fall 2025).

- **Annie:** front end, Chart.js visualizations, UI/UX, responsive design, and the Azure deployment and CI/CD pipeline
- **Komalpreet:** Python data pipeline, Azure Blob Storage integration, and serverless function
- **Rhailyn Jane:** authentication, two-factor authentication, RBAC, audit logging, and encryption

Data source: [Kaggle Healthy Diet Recipes dataset](https://www.kaggle.com/datasets/thedevastator/healthy-diet-recipes-a-comprehensive-dataset)

## Roadmap

- [x] Production deployment and CI/CD pipeline
- [ ] Unit tests
- [ ] Test step in the CI pipeline

## License

MIT. See [LICENSE](LICENSE).
