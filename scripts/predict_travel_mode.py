#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
predict_travel_mode.py

Receives travel and demographic features in JSON format via standard input,
runs inference across the 4 trained models (MNL, RF, Gradient Boosting, DNN),
and prints the resulting probability distributions in JSON format.
"""

import os
import sys
import pickle
import json
import pandas as pd
# pyrefly: ignore [missing-import]
import numpy as np

def main():
    # 1. Paths definition
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    models_dir = os.path.join(base_dir, "lib", "ml", "models")
    
    # 2. Check if models exist
    if not os.path.exists(os.path.join(models_dir, "scaler.pkl")):
        print(json.dumps({"error": "Models have not been trained yet. Run train_travel_mode_choice.py first."}))
        sys.exit(1)
        
    # 3. Load scaler, models, and metadata
    try:
        with open(os.path.join(models_dir, "scaler.pkl"), "rb") as f:
            scaler = pickle.load(f)
        
        models = {}
        for name in ['mnl', 'rf', 'xgb', 'dnn']:
            with open(os.path.join(models_dir, f"{name}_model.pkl"), "rb") as f:
                models[name] = pickle.load(f)
                
        with open(os.path.join(models_dir, "metadata.json"), "r") as f:
            metadata = json.load(f)
    except Exception as e:
        print(json.dumps({"error": f"Failed to load models: {str(e)}"}))
        sys.exit(1)
        
    feature_cols = metadata["feature_cols"]
    scaled_features = metadata["scaled_features"]
    
    # 4. Read input from stdin
    try:
        input_data = json.load(sys.stdin)
    except Exception as e:
        print(json.dumps({"error": f"Invalid JSON input: {str(e)}"}))
        sys.exit(1)
        
    # Input validation and defaults
    age = float(input_data.get("age", 35))
    female = float(input_data.get("female", 0)) # 0 or 1
    driving_license = float(input_data.get("driving_license", 1)) # 0 or 1
    car_ownership = float(input_data.get("car_ownership", 1))
    distance = float(input_data.get("distance", 2000)) # meters
    transit_cost = float(input_data.get("transit_cost", 1.5))
    driving_cost = float(input_data.get("driving_cost", 1.0))
    purpose = input_data.get("purpose", "HBW") # B, HBE, HBO, HBW, NHBO
    fueltype = input_data.get("fueltype", "Petrol") # Average, Diesel, Hybrid, Petrol
    day_of_week = float(input_data.get("day_of_week", 1)) # 1-7 (1=Monday, 7=Sunday)
    start_time = float(input_data.get("start_time", 9.0)) # hour of day, e.g. 9.0
    
    # 5. Derivations / Estimations for durations (in hours)
    # The LPMC dataset represents durations in hours.
    dur_walking = (distance / 1000.0) / 4.5   # 4.5 km/h walking speed
    dur_cycling = (distance / 1000.0) / 12.0  # 12 km/h cycling speed
    dur_driving = (distance / 1000.0) / 30.0  # 30 km/h driving speed
    dur_pt_access = 0.1                       # 6 minutes access walking time
    dur_pt_rail = (distance / 1000.0) / 45.0  # 45 km/h rail speed
    dur_pt_bus = (distance / 1000.0) / 18.0   # 18 km/h bus speed
    dur_pt_int_waiting = 0.08                 # 5 minutes wait
    dur_pt_int_walking = 0.03                 # 2 minutes transfer walk
    pt_n_interchanges = 1.0 if distance > 4000 else 0.0
    
    # 6. One-hot encoding for purpose and fueltype
    purposes = ["B", "HBE", "HBO", "HBW", "NHBO"]
    purpose_features = {f"purpose_{p}": 1.0 if purpose == p else 0.0 for p in purposes}
    
    fueltypes = ["Average", "Diesel", "Hybrid", "Petrol"]
    fueltype_features = {f"fueltype_{f}": 1.0 if fueltype == f else 0.0 for f in fueltypes}
    
    # Construct base dictionary of variables
    vars_dict = {
        "day_of_week": day_of_week,
        "start_time_linear": start_time,
        "age": age,
        "female": female,
        "driving_license": driving_license,
        "car_ownership": car_ownership,
        "distance": distance,
        "dur_walking": dur_walking,
        "dur_cycling": dur_cycling,
        "dur_pt_access": dur_pt_access,
        "dur_pt_rail": dur_pt_rail,
        "dur_pt_bus": dur_pt_bus,
        "dur_pt_int_waiting": dur_pt_int_waiting,
        "dur_pt_int_walking": dur_pt_int_walking,
        "pt_n_interchanges": pt_n_interchanges,
        "dur_driving": dur_driving,
        "cost_transit": transit_cost,
        "cost_driving_total": driving_cost,
    }
    
    # Update with one-hot encoded features
    vars_dict.update(purpose_features)
    vars_dict.update(fueltype_features)
    
    # Create DataFrame with exact column order
    df = pd.DataFrame([vars_dict], columns=feature_cols)
    
    # Scale continuous features
    df_scaled = df.copy()
    df_scaled[scaled_features] = scaler.transform(df[scaled_features])
    
    # Run predictions
    results = {}
    for name, clf in models.items():
        proba = clf.predict_proba(df_scaled)[0]
        results[name] = {
            "walk": float(proba[0]),
            "bike": float(proba[1]),
            "transit": float(proba[2]),
            "drive": float(proba[3])
        }
        
    print(json.dumps(results))

if __name__ == "__main__":
    main()
