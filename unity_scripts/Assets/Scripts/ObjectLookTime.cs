using UnityEngine;
using System.IO;
using System.Text;
using System;
using System.Collections.Generic;

namespace WMD.Sammorre.GamePlay.Tracking
{
    /// <summary>
    /// Tracks and accumulates look time for objects in the scene
    /// </summary>
    public class ObjectLookTime : MonoBehaviour
    {
        [Header("Raycast Settings")]
        [Tooltip("Maximum distance for the raycast")]
        [SerializeField]
        private float _lookDistance = 10f;
        
        private string _filePath;
        private Dictionary<string, float> _accumulatedLookTimes = 
            new Dictionary<string, float>();
        private GameObject _lastHitObject = null;
        private float _lastUpdateTime;
        private string _previousSessionData = "";
        
        private const string k_DELIMITER = ";";
        private const float k_MIN_LOOK_TIME = 0.05f;
        private const string k_REQUIRED_ROOT_NAME = "Products";
        private const string k_INVALID_HIERARCHY = "INVALID_HIERARCHY";
        
        /// <summary>
        /// Initialize data tracking and load previous session data
        /// </summary>
        private void Start()
        {
            _filePath = Path.Combine(
                Application.persistentDataPath, 
                "LookTimeData_Acc_Sessions.csv"
            );
            _lastUpdateTime = Time.time;
            
            Debug.Log($"[SETUP] Data will be updated at: {_filePath}");
            
            LoadPreviousSessionData();
        }
        
        /// <summary>
        /// Track object viewing time each frame
        /// </summary>
        private void Update()
        {
            float deltaTime = Time.time - _lastUpdateTime;
            
            AccumulateTimeForPreviousObject(deltaTime);
            PerformRaycastForCurrentFrame();
            
            _lastUpdateTime = Time.time;
        }
        
        /// <summary>
        /// Load data from previous sessions if available
        /// </summary>
        private void LoadPreviousSessionData()
        {
            if (File.Exists(_filePath))
            {
                _previousSessionData = File.ReadAllText(_filePath, Encoding.UTF8);
                
                // Add separator row
                _previousSessionData += 
                    $"\n\n{k_DELIMITER}{k_DELIMITER}--- NEW SESSION STARTED ON " +
                    $"{DateTime.Now:yyyy-MM-dd HH:mm:ss} ---{k_DELIMITER}\n";
                    
                Debug.Log("[SETUP] Previous session data loaded and separator row added.");
            }
            else
            {
                // File doesn't exist yet, start with custom header
                _previousSessionData = 
                    $"Timestamp{k_DELIMITER}ObjectName{k_DELIMITER}" +
                    $"ProductCategory{k_DELIMITER}TotalLookTime(sec)\n";
                Debug.Log("[SETUP] New CSV file header created.");
            }
        }
        
        /// <summary>
        /// Accumulate time for the object that was viewed in the previous frame
        /// </summary>
        private void AccumulateTimeForPreviousObject(float deltaTime)
        {
            if (_lastHitObject != null)
            {
                string key = GetObjectKey(_lastHitObject);
                
                if (key != k_INVALID_HIERARCHY)
                {
                    if (_accumulatedLookTimes.ContainsKey(key))
                    {
                        _accumulatedLookTimes[key] += deltaTime;
                    }
                    else
                    {
                        _accumulatedLookTimes.Add(key, deltaTime);
                    }
                }
            }
        }
        
        /// <summary>
        /// Perform raycast for the current frame to detect viewed objects
        /// </summary>
        private void PerformRaycastForCurrentFrame()
        {
            RaycastHit hit;
            if (Physics.Raycast(
                transform.position, 
                transform.forward, 
                out hit, 
                _lookDistance))
            {
                _lastHitObject = hit.collider.gameObject;
            }
            else
            {
                _lastHitObject = null;
            }
        }
        
        /// <summary>
        /// Get the hierarchical root name and validate the hierarchy
        /// </summary>
        private string GetHierarchicalRootName(Transform transform)
        {
            // Check if object itself is a Product Category
            if (transform.CompareTag("Category"))
            {
                Debug.Log($"[HIERARCHY CHECK] Object {transform.name} is a Product Category");
                return transform.name;
            }
            
            // Check if parent has Product Parent tag
            Transform parent = transform.parent;
            if (parent != null && parent.CompareTag("Product"))
            {
                Debug.Log($"[HIERARCHY CHECK] Parent {parent.name} has Product Parent tag");
                
                // Look for sibling that is a Category
                foreach (Transform sibling in parent)
                {
                    if (sibling.CompareTag("Category"))
                    {
                        Debug.Log($"[HIERARCHY CHECK] Found Category sibling: " +
                                 $"{sibling.name} for Product {transform.name}");
                        return sibling.name;
                    }
                }
            }
            
            // Traverse up to find Category or Products root
            Transform current = transform.parent;
            while (current != null)
            {
                if (current.CompareTag("Category"))
                {
                    Debug.Log($"[HIERARCHY CHECK] Found Category ancestor: " +
                             $"{current.name} for Product {transform.name}");
                    return current.name;
                }
                
                if (current.name == "Products")
                {
                    Debug.Log($"[HIERARCHY CHECK] Found Products root ancestor for " +
                             $"{transform.name}");
                    return transform.name;
                }
                
                current = current.parent;
            }
            
            // Fallback to original method if no tags found
            Debug.LogWarning($"[HIERARCHY WARNING] No proper tags found for " +
                            $"{transform.name}, using original method");
            
            return ValidateOriginalHierarchy(transform);
        }
        
        /// <summary>
        /// Validate the original hierarchy method as fallback
        /// </summary>
        private string ValidateOriginalHierarchy(Transform transform)
        {
            // Object's Parent (e.g., "water") - THIS IS THE GENRE WE NEED
            Transform productGenreParent = transform.parent;
            if (productGenreParent == null)
            {
                return k_INVALID_HIERARCHY;
            }
            
            // Object's Grandparent (THE REQUIRED ROOT, e.g., "Products")
            Transform requiredRoot = productGenreParent.parent;
            if (requiredRoot == null)
            {
                return k_INVALID_HIERARCHY;
            }
            
            // Validation: Check if the Grandparent has the required name ("Products")
            if (requiredRoot.name == k_REQUIRED_ROOT_NAME)
            {
                Debug.Log($"[HIERARCHY CHECK] Validation passed: " +
                         $"Root={requiredRoot.name}, Genre={productGenreParent.name}");
                return productGenreParent.name;
            }
            
            return k_INVALID_HIERARCHY;
        }
        
        /// <summary>
        /// Create a unique key that validates the hierarchy
        /// </summary>
        private string GetObjectKey(GameObject gameObject)
        {
            // Use object name directly since we're using tag-based detection
            return gameObject.name;
        }
        
        /// <summary>
        /// Get the final storage of all total times for the CURRENT session
        /// </summary>
        private string GetCurrentSessionData()
        {
            StringBuilder stringBuilder = new StringBuilder();
            
            foreach (var kvp in _accumulatedLookTimes)
            {
                string objectName = kvp.Key;
                float totalTime = kvp.Value;
                
                // Only save if total time exceeds minimum threshold
                if (totalTime < k_MIN_LOOK_TIME)
                {
                    continue;
                }
                
                // Format the data as a CSV row
                string logEntry = 
                    $"{DateTime.Now:yyyy-MM-dd HH:mm:ss}{k_DELIMITER}" +
                    $"{objectName}{k_DELIMITER}{objectName}{k_DELIMITER}" +
                    $"{totalTime:F2}\n";
                    
                stringBuilder.Append(logEntry);
                Debug.Log($"[SESSION DATA] Prepared: {objectName} ({totalTime:F2}s)");
            }
            
            return stringBuilder.ToString();
        }
        
        /// <summary>
        /// Ensure ALL data is saved when the application is closed
        /// </summary>
        private void OnApplicationQuit()
        {
            // Get data from current session
            string currentSessionData = GetCurrentSessionData();
            
            // Combine old data, separator row, and new data
            string finalData = _previousSessionData + currentSessionData;
            
            // Write everything back to the file in one operation
            try
            {
                File.WriteAllText(_filePath, finalData, Encoding.UTF8);
                Debug.Log($"[FINAL SAVE] All session data successfully written to {_filePath}");
            }
            catch (Exception exception)
            {
                Debug.LogError($"[CRITICAL] Error writing to CSV: {exception.Message}");
            }
        }
    }
}