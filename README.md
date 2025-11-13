# Nutritional Insights - Cloud-Native Application

A comprehensive web-based data visualization and analysis platform for exploring nutritional information from the Kaggle "Healthy Diet Recipes" dataset. Built with a cloud-native architecture using Azure Blob Storage, serverless processing, and interactive frontend visualizations.

## 🎯 Project Overview

This application processes and visualizes nutritional data from 7,806 recipes across 5 diet types (Dash, Keto, Mediterranean, Paleo, Vegan), providing insights into macronutrient content, recipe distributions, and dietary patterns.

**Data Source:** [Kaggle - Healthy Diet Recipes Dataset](https://www.kaggle.com/datasets/thedevastator/healthy-diet-recipes-a-comprehensive-dataset?select=All_Diets.csv)

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (UI-for-project3.html)         │
│  • Interactive Charts (Chart.js)                            │
│  • Real-time Filtering & Search                             │
│  • OAuth/2FA Integration                                     │
│  • GDPR Compliance UI                                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Serverless Processing Layer                     │
│  • lambda_function.py (Azure Blob Storage Integration)      │
│  • Data Processing & Aggregation                            │
│  • NoSQL Simulation (nutrition_results.json)                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  Data Analysis Pipeline                      │
│  • data_analysis.py (Python, Pandas, Seaborn)               │
│  • Statistical Analysis & Metrics                           │
│  • Visualization Generation (PNG exports)                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                 Data Storage (Azure Blob)                    │
│  • Container: datasets                                       │
│  • File: All_Diets.csv (7,806 records)                      │
│  • Connection: Azurite (local dev)                          │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Features

### Data Visualizations
- **Bar Chart**: Average macronutrient content by diet type
- **Scatter Plot**: Protein vs. Carbs relationship analysis
- **Heatmap**: Nutrient correlation matrix
- **Pie Chart**: Recipe distribution across diet types

### Interactive Features
- Real-time data filtering and search
- Dynamic chart updates
- Pagination for large datasets
- API interaction simulation

### Cloud-Native Components
- **Azure Blob Storage Integration**: Secure data storage with Azurite
- **Serverless Processing**: Lambda function for data transformation
- **OAuth & 2FA**: Secure authentication (Google, GitHub)
- **Security & Compliance**: GDPR-compliant, encrypted data handling
- **Resource Management**: Cloud resource cleanup automation

## 📁 Project Structure

```
nutritional-insights/
├── UI-for-project3.html              # Main cloud-native frontend
├── project2ui.html                   # Previous iteration (reference)
├── All_Diets.csv                     # Kaggle dataset (7,806 recipes)
├── data_analysis.py                  # Python data processing pipeline
├── lambda_function.py                # Serverless Azure Blob processor
├── Dockerfile                        # Container configuration
├── README.md                         # This file
├── avg_protein_by_diet_type.png      # Generated visualization
├── avg_macros_heatmap.png            # Generated heatmap
├── top_protein_recipes_scatter.png   # Generated scatter plot
└── simulated_nosql/
    └── nutrition_results.json        # Processed aggregated data
```

## 🚀 Quick Start

### Prerequisites
- Python 3.11 or 3.12 (recommended for data science packages)
- pip package manager
- Modern web browser

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd nutritional-insights
```

2. **Install Python dependencies**
```bash
pip install pandas seaborn matplotlib azure-storage-blob --break-system-packages
```

### Running the Application

#### 1. Run Data Analysis
```bash
python data_analysis.py --csv All_Diets.csv --no-show
```

**Output:**
- `avg_protein_by_diet_type.png`
- `avg_macros_heatmap.png`
- `top_protein_recipes_scatter.png`
- Console output with statistics

#### 2. Process Data via Lambda Function
```bash
python lambda_function.py
```

**Output:**
- `simulated_nosql/nutrition_results.json`
- Processing logs with metadata

#### 3. Open Frontend
```bash
# Option A: Direct file access
open UI-for-project3.html

# Option B: Local server (recommended)
python -m http.server 5500
# Navigate to: http://localhost:5500/UI-for-project3.html
```

## 📈 Data Insights

### Average Macronutrients by Diet Type
| Diet Type     | Protein (g) | Carbs (g)  | Fat (g)    | Recipes |
|--------------|-------------|------------|------------|---------|
| Dash         | 69.28       | 160.54     | 101.15     | 1,745   |
| Keto         | 101.27      | 57.97      | 153.12     | 1,512   |
| Mediterranean| 101.11      | 152.91     | 101.42     | 1,753   |
| Paleo        | 88.67       | 129.55     | 135.67     | 1,274   |
| Vegan        | 56.16       | 254.00     | 103.30     | 1,522   |

**Key Findings:**
- 🥇 **Highest Protein**: Keto & Mediterranean (~101g)
- 🍝 **Highest Carbs**: Vegan (254g)
- 🥑 **Highest Fat**: Keto (153g)
- 📊 **Most Recipes**: Mediterranean (1,753)

## 🔒 Security Features

- **Encryption**: AES-256 for data at rest
- **Access Control**: Role-Based Access Control (RBAC)
- **Authentication**: OAuth 2.0 (Google, GitHub) + 2FA
- **Compliance**: GDPR-compliant data handling
- **Secure Storage**: Azure Blob with connection string encryption

## 🐳 Docker Support

Build and run the application in a container:

```bash
# Build image
docker build -t nutritional-insights .

# Run container
docker run -p 5500:5500 nutritional-insights
```

## 🛠️ Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | HTML5, Tailwind CSS, Chart.js |
| Data Processing | Python 3.11+, Pandas, Seaborn, Matplotlib |
| Cloud Storage | Azure Blob Storage (Azurite for local dev) |
| Serverless | Python Lambda Function |
| Containerization | Docker |
| Dataset | Kaggle CSV (7,806 recipes) |

## 📝 API Endpoints (Simulated)

- `GET /nutritional-insights` - Retrieve aggregated macronutrient data
- `GET /recipes` - Fetch recipe details and statistics
- `GET /clusters` - Get cluster analysis results

## 🧪 Testing

### Run Python Analysis Tests
```bash
# Test with CSV
python data_analysis.py --csv All_Diets.csv --no-show

# Test with JSON fallback
python data_analysis.py --no-show
```

### Test Lambda Function
```bash
python lambda_function.py
```

**Expected Output:**
```
[timestamp] Starting serverless function execution...
[timestamp] Connecting to Azurite Blob Storage...
[timestamp] Dataset shape: (7806, X)
[timestamp] Results saved to: simulated_nosql/nutrition_results.json
Execution completed: {'status': 'success', ...}
```

## 🐛 Troubleshooting

### Issue: `ModuleNotFoundError: No module named 'pandas'`
**Solution:** Use Python 3.11 or 3.12
```bash
py -3.12 -m pip install pandas seaborn matplotlib --break-system-packages
py -3.12 data_analysis.py --csv All_Diets.csv --no-show
```

### Issue: Azure Blob Connection Failed
**Solution:** Ensure Azurite is running
```bash
azurite --location ./azurite-data
```

### Issue: Charts not displaying
**Solution:** Ensure internet connection for CDN (Chart.js, Tailwind CSS)

## 👥 Team

**Group 7**
- Annie
- Komalpreet  
- Rhailyn Jane

## 📄 License

© 2025 Nutritional Insights. All Rights Reserved.

## 🔗 Links

- [Kaggle Dataset](https://www.kaggle.com/datasets/thedevastator/healthy-diet-recipes-a-comprehensive-dataset)
- [Azure Blob Storage Docs](https://docs.microsoft.com/en-us/azure/storage/blobs/)
- [Chart.js Documentation](https://www.chartjs.org/docs/)

---

**Assignment:** Cloud-Native Nutritional Insights Application  
**Course:** CPSY-300-C Cloud Computing
**Date:** November 2025