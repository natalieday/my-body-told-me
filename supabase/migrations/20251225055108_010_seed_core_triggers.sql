/*
  # Seed Core Triggers

  1. Purpose
    - Insert all core trigger definitions
    - Set up parent-child relationships for food tracking

  2. Triggers
    - Sleep duration
    - Stress level
    - Energy level
    - Hydration
    - Physical activity
    - Caffeine
    - Alcohol/substances
    - Medication adherence
    - Weather/heat exposure
    - Illness
    - Menstrual cycle (on_period, period_pain)
    - Food tracking (parent + sub-triggers)
*/

INSERT INTO triggers (key, label, category, input_type, options_json, is_active, sort_order)
VALUES
  ('sleep_duration', 'Sleep Duration', 'sleep', 'enum', 
   '{"options": ["≤4 hours", "5-6 hours", "7-8 hours", "9+ hours"]}', 
   true, 1),
  
  ('stress_level', 'Stress Level', 'lifestyle', 'scale', 
   '{"min": 0, "max": 5, "labels": {"0": "None", "5": "Extreme"}}', 
   true, 2),
  
  ('energy_level', 'Energy Level', 'activity', 'scale', 
   '{"min": 0, "max": 5, "labels": {"0": "Exhausted", "5": "Energized"}}', 
   true, 3),
  
  ('water_intake', 'Hydration', 'lifestyle', 'enum', 
   '{"options": ["0 bottles", "1 bottle", "2 bottles", "3+ bottles"]}', 
   true, 4),
  
  ('physical_activity', 'Physical Activity', 'activity', 'enum', 
   '{"options": ["None", "Light", "Moderate", "Intense"]}', 
   true, 5),
  
  ('caffeine_level', 'Caffeine', 'lifestyle', 'enum', 
   '{"options": ["None", "Low", "Moderate", "High"]}', 
   true, 6),
  
  ('substances_level', 'Alcohol / Substances', 'lifestyle', 'enum', 
   '{"options": ["None", "Low", "Moderate", "High"]}', 
   true, 7),
  
  ('med_adherence', 'Medication Adherence', 'medical', 'enum', 
   '{"options": ["Taken as prescribed", "Took late", "Missed dose"]}', 
   true, 8),
  
  ('heat_exposure', 'Weather / Heat', 'environment', 'enum', 
   '{"options": ["Cold", "Comfortable", "Hot", "Very hot"]}', 
   true, 9),
  
  ('illness_today', 'Illness Today', 'medical', 'binary', 
   '{"options": ["No", "Yes"]}', 
   true, 10),
  
  ('on_period', 'On Period', 'menstrual', 'binary', 
   '{"options": ["No", "Yes"]}', 
   true, 11),
  
  ('period_pain', 'Period Pain', 'menstrual', 'scale', 
   '{"min": 0, "max": 5, "labels": {"0": "None", "5": "Severe"}}', 
   true, 12),
  
  ('food_tracking', 'Food Tracking', 'food', 'binary', 
   '{"options": ["Disabled", "Enabled"]}', 
   true, 13)
ON CONFLICT (key) DO NOTHING;

DO $$
DECLARE
  food_parent_id uuid;
BEGIN
  SELECT id INTO food_parent_id FROM triggers WHERE key = 'food_tracking';
  
  IF food_parent_id IS NOT NULL THEN
    INSERT INTO triggers (key, label, category, input_type, options_json, is_active, parent_trigger_id, sort_order)
    VALUES
      ('meal_regularity', 'Meal Regularity', 'food', 'enum', 
       '{"options": ["Regular", "Skipped", "Irregular"]}', 
       true, food_parent_id, 14),
      
      ('meal_heaviness', 'Meal Heaviness', 'food', 'enum', 
       '{"options": ["Light", "Normal", "Heavy"]}', 
       true, food_parent_id, 15),
      
      ('sugar_carb_load', 'Sugar / Carb Load', 'food', 'enum', 
       '{"options": ["Low", "Medium", "High"]}', 
       true, food_parent_id, 16),
      
      ('electrolytes_level', 'Electrolytes', 'food', 'enum', 
       '{"options": ["Low", "Medium", "High"]}', 
       true, food_parent_id, 17),
      
      ('salt_intake', 'Salt Intake', 'food', 'enum', 
       '{"options": ["Low", "Medium", "High"]}', 
       true, food_parent_id, 18)
    ON CONFLICT (key) DO NOTHING;
  END IF;
END $$;
