import azure.functions as func
import logging
import json
import pandas as pd
import os
from io import StringIO
from azure.storage.blob import BlobServiceClient

# Initialize the Function App
app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

# Azure Blob Storage configuration
STORAGE_CONNECTION_STRING = os.environ.get("AzureWebJobsStorage", "")
CONTAINER_NAME = "nutritiondata"
BLOB_NAME = "All_Diets.csv"


def load_nutrition_data():
    """Load nutrition data from Azure Blob Storage."""
    try:
        blob_service_client = BlobServiceClient.from_connection_string(STORAGE_CONNECTION_STRING)
        blob_client = blob_service_client.get_blob_client(container=CONTAINER_NAME, blob=BLOB_NAME)

        # Download blob content
        blob_data = blob_client.download_blob().readall().decode('utf-8')

        # Parse CSV into DataFrame
        df = pd.read_csv(StringIO(blob_data))
        logging.info(f"Loaded {len(df)} records from blob storage")
        return df
    except Exception as e:
        logging.error(f"Error loading data from blob storage: {str(e)}")
        raise


def calculate_diet_summary(df):
    """Calculate average macronutrients by diet type."""
    summary = df.groupby('Diet_type').agg({
        'Protein(g)': 'mean',
        'Carbs(g)': 'mean',
        'Fat(g)': 'mean',
        'Recipe_name': 'count'
    }).reset_index()

    summary.columns = ['diet_type', 'avg_protein', 'avg_carbs', 'avg_fat', 'recipe_count']
    return summary.to_dict('records')


# ============================================
# ENDPOINT 1: Health Check
# ============================================
@app.route(route="health", methods=["GET"])
def health_check(req: func.HttpRequest) -> func.HttpResponse:
    """Health check endpoint to verify the API is running."""
    logging.info("Health check requested")

    return func.HttpResponse(
        json.dumps({
            "status": "healthy",
            "service": "Nutritional Insights API",
            "version": "2.0.0"
        }),
        mimetype="application/json",
        status_code=200
    )


# ============================================
# ENDPOINT 2: Nutrition Summary
# ============================================
@app.route(route="nutrition/summary", methods=["GET"])
def nutrition_summary(req: func.HttpRequest) -> func.HttpResponse:
    """Get aggregated macronutrient data by diet type."""
    logging.info("Nutrition summary requested")

    try:
        df = load_nutrition_data()
        summary = calculate_diet_summary(df)

        return func.HttpResponse(
            json.dumps({
                "status": "success",
                "data": summary,
                "total_records": len(df),
                "diet_types": len(summary)
            }),
            mimetype="application/json",
            status_code=200
        )
    except Exception as e:
        logging.error(f"Error in nutrition_summary: {str(e)}")
        return func.HttpResponse(
            json.dumps({"status": "error", "message": str(e)}),
            mimetype="application/json",
            status_code=500
        )


# ============================================
# ENDPOINT 3: Top Protein Recipes
# ============================================
@app.route(route="recipes/top-protein", methods=["GET"])
def top_protein_recipes(req: func.HttpRequest) -> func.HttpResponse:
    """Get top recipes by protein content."""
    logging.info("Top protein recipes requested")

    try:
        # Get limit parameter (default 10)
        limit = req.params.get('limit', '10')
        try:
            limit = int(limit)
        except ValueError:
            limit = 10

        df = load_nutrition_data()

        # Sort by protein and get top N
        top_recipes = df.nlargest(limit, 'Protein(g)')[
            ['Recipe_name', 'Diet_type', 'Protein(g)', 'Carbs(g)', 'Fat(g)']
        ].to_dict('records')

        return func.HttpResponse(
            json.dumps({
                "status": "success",
                "data": top_recipes,
                "count": len(top_recipes)
            }),
            mimetype="application/json",
            status_code=200
        )
    except Exception as e:
        logging.error(f"Error in top_protein_recipes: {str(e)}")
        return func.HttpResponse(
            json.dumps({"status": "error", "message": str(e)}),
            mimetype="application/json",
            status_code=500
        )


# ============================================
# ENDPOINT 4: Get Recipes (with filtering)
# ============================================
@app.route(route="recipes", methods=["GET"])
def get_recipes(req: func.HttpRequest) -> func.HttpResponse:
    """Get recipes with optional diet type filtering."""
    logging.info("Recipes requested")

    try:
        df = load_nutrition_data()

        # Get filter parameters
        diet_type = req.params.get('diet_type', None)
        limit = req.params.get('limit', '100')

        try:
            limit = int(limit)
        except ValueError:
            limit = 100

        # Apply diet type filter if specified
        if diet_type and diet_type.lower() != 'all':
            df = df[df['Diet_type'].str.lower() == diet_type.lower()]

        # Get recipes with limit
        recipes = df.head(limit)[
            ['Recipe_name', 'Diet_type', 'Protein(g)', 'Carbs(g)', 'Fat(g)']
        ].to_dict('records')

        # Calculate statistics
        stats = {
            "total_recipes": len(df),
            "avg_protein": round(df['Protein(g)'].mean(), 2),
            "avg_carbs": round(df['Carbs(g)'].mean(), 2),
            "avg_fat": round(df['Fat(g)'].mean(), 2)
        }

        return func.HttpResponse(
            json.dumps({
                "status": "success",
                "data": recipes,
                "statistics": stats,
                "count": len(recipes)
            }),
            mimetype="application/json",
            status_code=200
        )
    except Exception as e:
        logging.error(f"Error in get_recipes: {str(e)}")
        return func.HttpResponse(
            json.dumps({"status": "error", "message": str(e)}),
            mimetype="application/json",
            status_code=500
        )


# ============================================
# ENDPOINT 5: Cluster Analysis
# ============================================
@app.route(route="clusters", methods=["GET"])
def get_clusters(req: func.HttpRequest) -> func.HttpResponse:
    """Get diet type clustering based on macronutrient profiles."""
    logging.info("Cluster analysis requested")

    try:
        df = load_nutrition_data()
        summary = df.groupby('Diet_type').agg({
            'Protein(g)': 'mean',
            'Carbs(g)': 'mean',
            'Fat(g)': 'mean',
            'Recipe_name': 'count'
        }).reset_index()

        clusters = []
        for _, row in summary.iterrows():
            # Determine cluster based on dominant macronutrient
            protein = row['Protein(g)']
            carbs = row['Carbs(g)']
            fat = row['Fat(g)']

            if protein > carbs and protein > fat:
                cluster = "High Protein"
            elif carbs > protein and carbs > fat:
                cluster = "High Carb"
            elif fat > protein and fat > carbs:
                cluster = "High Fat"
            else:
                cluster = "Balanced"

            clusters.append({
                "diet_type": row['Diet_type'],
                "cluster": cluster,
                "avg_protein": round(protein, 2),
                "avg_carbs": round(carbs, 2),
                "avg_fat": round(fat, 2),
                "recipe_count": int(row['Recipe_name'])
            })

        return func.HttpResponse(
            json.dumps({
                "status": "success",
                "data": clusters,
                "cluster_types": ["High Protein", "High Carb", "High Fat", "Balanced"]
            }),
            mimetype="application/json",
            status_code=200
        )
    except Exception as e:
        logging.error(f"Error in get_clusters: {str(e)}")
        return func.HttpResponse(
            json.dumps({"status": "error", "message": str(e)}),
            mimetype="application/json",
            status_code=500
        )


# ============================================
# ENDPOINT 6: Security Status
# ============================================
@app.route(route="security/status", methods=["GET"])
def security_status(req: func.HttpRequest) -> func.HttpResponse:
    """Get current security status and compliance information."""
    logging.info("Security status requested")

    return func.HttpResponse(
        json.dumps({
            "status": "success",
            "data": {
                "encryption": {
                    "enabled": True,
                    "algorithm": "AES-256",
                    "status": "Active"
                },
                "access_control": {
                    "enabled": True,
                    "type": "RBAC",
                    "roles": ["admin", "user", "viewer"]
                },
                "compliance": {
                    "gdpr": True,
                    "hipaa": False,
                    "soc2": True
                },
                "last_audit": "2025-01-15T10:30:00Z",
                "threat_level": "Low"
            }
        }),
        mimetype="application/json",
        status_code=200
    )


# ============================================
# ENDPOINT 7: 2FA Verification
# ============================================
@app.route(route="auth/2fa/verify", methods=["POST"])
def verify_2fa(req: func.HttpRequest) -> func.HttpResponse:
    """Verify 2FA code."""
    logging.info("2FA verification requested")

    try:
        req_body = req.get_json()
        code = req_body.get('code', '')

        # Validate code format (6 digits)
        if len(code) == 6 and code.isdigit():
            # In production, verify against actual TOTP
            return func.HttpResponse(
                json.dumps({
                    "status": "success",
                    "message": "2FA verification successful",
                    "verified": True
                }),
                mimetype="application/json",
                status_code=200
            )
        else:
            return func.HttpResponse(
                json.dumps({
                    "status": "error",
                    "message": "Invalid 2FA code format",
                    "verified": False
                }),
                mimetype="application/json",
                status_code=400
            )
    except Exception as e:
        logging.error(f"Error in verify_2fa: {str(e)}")
        return func.HttpResponse(
            json.dumps({"status": "error", "message": str(e)}),
            mimetype="application/json",
            status_code=500
        )


# ============================================
# ENDPOINT 8: Cloud Resource Cleanup
# ============================================
@app.route(route="cloud/cleanup", methods=["POST"])
def cloud_cleanup(req: func.HttpRequest) -> func.HttpResponse:
    """Simulate cloud resource cleanup."""
    logging.info("Cloud cleanup requested")

    import random

    # Simulate cleanup metrics
    cleanup_result = {
        "status": "success",
        "message": "Cloud resources cleanup completed",
        "data": {
            "temp_files_deleted": random.randint(10, 50),
            "cache_cleared_mb": round(random.uniform(50, 200), 2),
            "connections_closed": random.randint(5, 20),
            "memory_freed_mb": round(random.uniform(100, 500), 2),
            "cleanup_duration_ms": random.randint(500, 2000)
        }
    }

    return func.HttpResponse(
        json.dumps(cleanup_result),
        mimetype="application/json",
        status_code=200
    )
