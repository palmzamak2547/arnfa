#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
train_travel_mode_choice.py

Trains 4 models (Multinomial Logit, Random Forest, XGBoost, Deep Neural Network)
on the preprocessed London Passenger Mode Choice (LPMC) dataset.
Saves the trained models and standard scaler to lib/ml/models/.
"""

import os
import pickle
import json
import pandas as pd
import numpy as np

from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import accuracy_score, f1_score


def main():
    print("=== Training Travel Mode Choice Models ===")
    
    # 1. Paths definition
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(base_dir, "travel_mode_choice", "Data", "Datasets", "preprocessed")
    train_path = os.path.join(data_dir, "LPMC_train.csv")
    test_path = os.path.join(data_dir, "LPMC_test.csv")
    models_dir = os.path.join(base_dir, "lib", "ml", "models")
    
    os.makedirs(models_dir, exist_ok=True)
    
    if not os.path.exists(train_path) or not os.path.exists(test_path):
        print(f"Error: Preprocessed datasets not found in {data_dir}.")
        return
        
    # 2. Load dataset
    print("Loading datasets...")
    train_df = pd.read_csv(train_path)
    test_df = pd.read_csv(test_path)
    
    print(f"Train shape: {train_df.shape}, Test shape: {test_df.shape}")
    
    # 3. Define features and target
    # target is 'travel_mode'
    # 'household_id' is group identifier and not a feature
    target_col = 'travel_mode'
    drop_cols = ['household_id', target_col]
    
    feature_cols = [c for c in train_df.columns if c not in drop_cols]
    
    X_train = train_df[feature_cols].copy()
    y_train = train_df[target_col].copy()
    X_test = test_df[feature_cols].copy()
    y_test = test_df[target_col].copy()
    
    # Continuous features to be scaled (as defined in the original paper)
    scaled_features = [
        'day_of_week', 'start_time_linear', 'age', 'car_ownership',
        'distance', 'dur_walking', 'dur_cycling', 'dur_pt_access', 'dur_pt_rail',
        'dur_pt_bus', 'dur_pt_int_waiting', 'dur_pt_int_walking', 'pt_n_interchanges',
        'dur_driving', 'cost_transit', 'cost_driving_total'
    ]
    
    # Check that all scaled features exist in feature cols
    scaled_features = [f for f in scaled_features if f in feature_cols]
    
    print(f"Features: {feature_cols}")
    print(f"Scaling continuous features: {scaled_features}")
    
    # 4. Standard Scaling
    scaler = StandardScaler()
    
    # We fit scaler only on scaled_features
    X_train_scaled = X_train.copy()
    X_test_scaled = X_test.copy()
    
    X_train_scaled[scaled_features] = scaler.fit_transform(X_train[scaled_features])
    X_test_scaled[scaled_features] = scaler.transform(X_test[scaled_features])
    
    # 5. Model Training and Evaluation
    models = {}
    
    # Model 1: Multinomial Logit (using scikit-learn Logistic Regression L2 regularized)
    print("\nTraining Multinomial Logit (MNL) equivalent...")
    mnl = LogisticRegression(max_iter=1000, random_state=42)

    mnl.fit(X_train_scaled, y_train)
    models['mnl'] = mnl
    
    # Model 2: Random Forest (using adjusted parameters or safe defaults)
    print("Training Random Forest...")
    rf = RandomForestClassifier(
        n_estimators=178,
        max_depth=10,
        max_features=min(15, len(feature_cols)),
        min_samples_leaf=10,
        random_state=42,
        n_jobs=-1
    )
    rf.fit(X_train_scaled, y_train)
    models['rf'] = rf
    
    # Model 3: Gradient Boosting Classifier
    print("Training Gradient Boosting Classifier...")
    xgb = GradientBoostingClassifier(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        random_state=42
    )
    xgb.fit(X_train_scaled, y_train)
    models['xgb'] = xgb

    
    # Model 4: Deep Neural Network (MLP Classifier)
    print("Training Deep Neural Network (DNN)...")
    dnn = MLPClassifier(
        hidden_layer_sizes=(64, 32),
        activation='relu',
        solver='adam',
        max_iter=300,
        batch_size=64,
        random_state=42
    )
    dnn.fit(X_train_scaled, y_train)
    models['dnn'] = dnn
    
    # 6. Evaluation on Test Set
    metrics = {}
    for name, clf in models.items():
        y_pred = clf.predict(X_test_scaled)
        acc = accuracy_score(y_test, y_pred)
        f1_macro = f1_score(y_test, y_pred, average='macro')
        metrics[name] = {"accuracy": float(acc), "f1_macro": float(f1_macro)}
        print(f"[{name.upper()}] Test Accuracy: {acc:.4f}, Test F1-Macro: {f1_macro:.4f}")
        
    # 7. Serialize Models and Metadata
    print("\nSaving models to lib/ml/models/...")
    
    # Save scaler
    with open(os.path.join(models_dir, "scaler.pkl"), "wb") as f:
        pickle.dump(scaler, f)
        
    # Save individual models
    for name, clf in models.items():
        with open(os.path.join(models_dir, f"{name}_model.pkl"), "wb") as f:
            pickle.dump(clf, f)
            
    # Save metadata
    metadata = {
        "feature_cols": feature_cols,
        "scaled_features": scaled_features,
        "metrics": metrics,
        "class_mapping": {0: "Walk", 1: "Bike", 2: "Transit", 3: "Drive"}
    }
    with open(os.path.join(models_dir, "metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)
        
    print("All models successfully trained and serialized!")

if __name__ == "__main__":
    main()
