#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
train_pm25_model.py
===================
Generates a realistic Bangkok meteorological and PM2.5 dataset,
and trains a 3-layer Multi-Layer Perceptron (neural network) regressor
equivalent to the DL model in krittintrs/DL-for-PM2.5-Prediction (Dense(12) x 3).
"""

import os
import json
import pickle
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.neural_network import MLPRegressor
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error

def generate_bangkok_pm25_data(n_days=1000):
    np.random.seed(42)
    
    # Generate days and seasons
    # 0 = Dry/Cool (high PM2.5), 1 = Hot/Haze (medium PM2.5), 2 = Rainy (low PM2.5)
    season = np.random.choice([0, 1, 2], size=n_days, p=[0.33, 0.17, 0.5])
    
    # 1. Base weather metrics per season
    temp = np.zeros(n_days)
    rh = np.zeros(n_days)
    wind_speed = np.zeros(n_days)
    rainfall = np.zeros(n_days)
    visibility = np.zeros(n_days)
    pm25 = np.zeros(n_days)
    
    for i in range(n_days):
        s = season[i]
        if s == 0:  # Cool / Dry Season (Nov - Feb)
            temp[i] = np.random.normal(29.0, 2.0)
            rh[i] = np.random.normal(58.0, 5.0)
            wind_speed[i] = np.random.normal(8.0, 3.0)
            rainfall[i] = np.random.exponential(2.0) if np.random.rand() < 0.1 else 0.0
            visibility[i] = np.random.normal(5.5, 1.2)
            pm25[i] = np.random.normal(45.0, 12.0)
        elif s == 1:  # Hot / Haze Season (Mar - Apr)
            temp[i] = np.random.normal(35.0, 1.5)
            rh[i] = np.random.normal(65.0, 5.0)
            wind_speed[i] = np.random.normal(11.0, 4.0)
            rainfall[i] = np.random.exponential(8.0) if np.random.rand() < 0.25 else 0.0
            visibility[i] = np.random.normal(6.5, 1.5)
            pm25[i] = np.random.normal(32.0, 8.0)
        else:  # Rainy Season (May - Oct)
            temp[i] = np.random.normal(31.0, 1.8)
            rh[i] = np.random.normal(82.0, 6.0)
            wind_speed[i] = np.random.normal(18.0, 5.0)
            rainfall[i] = np.random.exponential(25.0) if np.random.rand() < 0.65 else 0.0
            visibility[i] = np.random.normal(8.5, 1.0)
            pm25[i] = np.random.normal(18.0, 5.0)
            
    # Ensure realistic bounds
    temp = np.clip(temp, 18.0, 42.0)
    rh = np.clip(rh, 30.0, 100.0)
    wind_speed = np.clip(wind_speed, 1.0, 45.0)
    rainfall = np.clip(rainfall, 0.0, 150.0)
    visibility = np.clip(visibility, 1.0, 10.0)
    pm25 = np.clip(pm25, 5.0, 120.0)
    
    # 2. Add time lags and physical relationships
    df = pd.DataFrame({
        "temp": temp,
        "RH": rh,
        "wind_speed": wind_speed,
        "rainfall": rainfall,
        "visibility": visibility,
        "pm2.5": pm25
    })
    
    # Create lag columns for PM2.5
    df["pm2.5_lag1"] = df["pm2.5"].shift(1)
    df["pm2.5_lag2"] = df["pm2.5"].shift(2)
    
    # Create lag columns for rainfall
    df["rainfall_lag1"] = df["rainfall"].shift(1)
    df["rainfall_lag2"] = df["rainfall"].shift(2)
    
    # Fill NaN values from shift
    df.fillna(method="bfill", inplace=True)
    
    # Refine PM2.5 using physical formulas to ensure it correlates with weather features
    refined_pm25 = (
        0.4 * df["pm2.5_lag1"] +
        0.15 * df["pm2.5_lag2"] +
        (100.0 - df["RH"]) * 0.15 +
        (35.0 - df["temp"]) * 0.4 +
        (30.0 / (df["wind_speed"] + 1.0)) * 0.8 +
        (10.0 - df["visibility"]) * 2.5 -
        df["rainfall"] * 0.15 -
        df["rainfall_lag1"] * 0.05
    )
    
    # Add random noise
    refined_pm25 += np.random.normal(0, 3.5, size=n_days)
    df["pm2.5"] = np.clip(refined_pm25, 4.0, 150.0)
    
    # Recalculate lags to make them fully consistent
    df["pm2.5_lag1"] = df["pm2.5"].shift(1)
    df["pm2.5_lag2"] = df["pm2.5"].shift(2)
    df.fillna(method="bfill", inplace=True)
    
    return df

def main():
    print("=== Training PM2.5 Prediction DL Model ===")
    
    # Paths
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    models_dir = os.path.join(base_dir, "lib", "ml", "models", "pm25")
    os.makedirs(models_dir, exist_ok=True)
    
    # Generate data
    df = generate_bangkok_pm25_data(1200)
    
    # Features as defined in the Jupyter Notebook
    feature_cols = [
        'rainfall',
        'rainfall_lag1',
        'rainfall_lag2',
        'RH',
        'wind_speed',
        'temp',
        'pm2.5_lag1',
        'pm2.5_lag2',
        'visibility'
    ]
    target_col = 'pm2.5'
    
    X = df[feature_cols].copy()
    y = df[[target_col]].copy()
    
    # Split train/test
    split_idx = int(len(df) * 0.8)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
    
    # Scale features (Standard Scaling)
    scaler_x = StandardScaler()
    scaler_y = StandardScaler()
    
    X_train_scaled = scaler_x.fit_transform(X_train)
    X_test_scaled = scaler_x.transform(X_test)
    
    y_train_scaled = scaler_y.fit_transform(y_train).ravel()
    y_test_scaled = scaler_y.transform(y_test).ravel()
    
    # Build MLP Regressor with 3 hidden layers of 12 neurons (Dense(12) x 3)
    # matching the high school award-winning architecture
    print("Fitting Multi-Layer Perceptron (Neural Network)...")
    mlp = MLPRegressor(
        hidden_layer_sizes=(12, 12, 12),
        activation='relu',
        solver='adam',
        max_iter=400,
        random_state=42,
        early_stopping=True,
        validation_fraction=0.1
    )
    
    mlp.fit(X_train_scaled, y_train_scaled)
    
    # Evaluate model
    y_pred_scaled = mlp.predict(X_test_scaled)
    y_pred = scaler_y.inverse_transform(y_pred_scaled.reshape(-1, 1)).ravel()
    y_test_raw = y_test.values.ravel()
    
    r2 = r2_score(y_test_raw, y_pred)
    mae = mean_absolute_error(y_test_raw, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test_raw, y_pred))
    
    print(f"Evaluation Metrics on Test Set:")
    print(f"  R2 Score:  {r2:.4f} (Paper targeted ~0.68)")
    print(f"  MAE:       {mae:.4f} μg/m³")
    print(f"  RMSE:      {rmse:.4f} μg/m³")
    
    # Save scalers and model
    print(f"Saving models to {models_dir}...")
    with open(os.path.join(models_dir, "scaler_x.pkl"), "wb") as f:
        pickle.dump(scaler_x, f)
    with open(os.path.join(models_dir, "scaler_y.pkl"), "wb") as f:
        pickle.dump(scaler_y, f)
    with open(os.path.join(models_dir, "model.pkl"), "wb") as f:
        pickle.dump(mlp, f)
        
    # Write metadata
    metadata = {
        "feature_cols": feature_cols,
        "metrics": {
            "r2": float(r2),
            "mae": float(mae),
            "rmse": float(rmse)
        }
    }
    with open(os.path.join(models_dir, "metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)
        
    print("PM2.5 prediction model trained successfully!")

if __name__ == "__main__":
    main()
