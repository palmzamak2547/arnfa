#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
predict_pm25.py
===============
Receives meteorological and historical PM2.5 inputs via stdin,
runs MLP neural network inference, and prints the predicted PM2.5 concentration in JSON format.
"""

import os
import sys
import pickle
import json
import pandas as pd
import numpy as np

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    models_dir = os.path.join(base_dir, "lib", "ml", "models", "pm25")
    
    # Check if models exist
    if not os.path.exists(os.path.join(models_dir, "model.pkl")):
        print(json.dumps({"error": "Models have not been trained yet. Run train_pm25_model.py first."}))
        sys.exit(1)
        
    # Load model and scalers
    try:
        with open(os.path.join(models_dir, "scaler_x.pkl"), "rb") as f:
            scaler_x = pickle.load(f)
        with open(os.path.join(models_dir, "scaler_y.pkl"), "rb") as f:
            scaler_y = pickle.load(f)
        with open(os.path.join(models_dir, "model.pkl"), "rb") as f:
            model = pickle.load(f)
        with open(os.path.join(models_dir, "metadata.json"), "r") as f:
            metadata = json.load(f)
    except Exception as e:
        print(json.dumps({"error": f"Failed to load models: {str(e)}"}))
        sys.exit(1)
        
    feature_cols = metadata["feature_cols"]
    
    # Read input from stdin
    try:
        input_data = json.load(sys.stdin)
    except Exception as e:
        print(json.dumps({"error": f"Invalid JSON input: {str(e)}"}))
        sys.exit(1)
        
    # Extract values with smart defaults
    payload = {
        "rainfall": float(input_data.get("rainfall", 0.0)),
        "rainfall_lag1": float(input_data.get("rainfall_lag1", 0.0)),
        "rainfall_lag2": float(input_data.get("rainfall_lag2", 0.0)),
        "RH": float(input_data.get("RH", 65.0)),
        "wind_speed": float(input_data.get("wind_speed", 12.0)),
        "temp": float(input_data.get("temp", 30.0)),
        "pm2.5_lag1": float(input_data.get("pm2.5_lag1", 25.0)),
        "pm2.5_lag2": float(input_data.get("pm2.5_lag2", 25.0)),
        "visibility": float(input_data.get("visibility", 6.0))
    }
    
    # Create dataframe with correct order
    df = pd.DataFrame([payload], columns=feature_cols)
    
    # Normalize features
    df_scaled = scaler_x.transform(df)
    
    # Predict
    pred_scaled = model.predict(df_scaled)
    pred = float(scaler_y.inverse_transform(pred_scaled.reshape(-1, 1))[0][0])
    
    # Return output
    output = {
        "pm25": round(pred, 2),
        "status": "success",
        "description": "Bangkok PM2.5 Prediction based on Deep Learning model"
    }
    
    print(json.dumps(output))

if __name__ == "__main__":
    main()
