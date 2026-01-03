using UnityEngine;
using System.IO;
using System.Text;
using System;
using System.Collections.Generic;

public class ObjectLookTime : MonoBehaviour
{
    // De maximale afstand van de raycast
    public float lookDistance = 10f;

    private string filePath;
    private Dictionary<string, float> accumulatedLookTimes = new Dictionary<string, float>();
    private GameObject lastHitObject = null;
    private float lastUpdateTime;
    private string previousSessionData = "";

    private const string DELIMITER = ";";
    private const float MIN_LOOK_TIME = 0.05f;

    // Definitie van de vereiste root-parent naam
    private const string REQUIRED_ROOT_NAME = "Products";

    void Start()
    {
        filePath = Application.persistentDataPath + "/LookTimeData_Acc_Sessions.csv";
        lastUpdateTime = Time.time;

        Debug.Log($"[SETUP] Data wordt bijgewerkt in: {filePath}");

        // 1. Laad data van VORIGE sessies (indien aanwezig)
        if (File.Exists(filePath))
        {
            previousSessionData = File.ReadAllText(filePath, Encoding.UTF8);

            // Voeg een scheidingsrij toe
            previousSessionData += "\n\n" + $"{DELIMITER}{DELIMITER}--- NIEUWE SESSIE GESTART OP {DateTime.Now:yyyy-MM-dd HH:mm:ss} ---{DELIMITER}\n";
            Debug.Log("[SETUP] Oude sessie data geladen en scheidingsrij toegevoegd.");
        }
        else
        {
            // Bestand bestaat nog niet, begin met de aangepaste header
            previousSessionData = $"Tijdstempel{DELIMITER}ObjectNaam{DELIMITER}Product Catergory{DELIMITER}Totale Kijktijd (sec)\n";
            Debug.Log("[SETUP] Nieuw CSV-bestand header aangemaakt.");
        }
    }

    void Update()
    {
        float deltaTime = Time.time - lastUpdateTime;

        // 1. Accumuleer tijd voor het object dat in de VORIGE frame werd bekeken
        if (lastHitObject != null)
        {
            string key = GetObjectKey(lastHitObject);

            // ✅ HIER GEBEURT DE FILTERING! Alleen objecten met de correcte hiërarchie krijgen accumulatie.
            if (key != "INVALID_HIERARCHY")
            {
                if (accumulatedLookTimes.ContainsKey(key))
                {
                    accumulatedLookTimes[key] += deltaTime;
                }
                else
                {
                    accumulatedLookTimes.Add(key, deltaTime);
                }
            }
            // Anders wordt de tijd Weggegooid (bv. voor de "Ground")
        }

        // 2. Raycast uit voor de HUIDIGE frame
        RaycastHit hit;
        if (Physics.Raycast(transform.position, transform.forward, out hit, lookDistance))
        {
            lastHitObject = hit.collider.gameObject;
        }
        else
        {
            lastHitObject = null; // Kijken naar niets
        }

        lastUpdateTime = Time.time;
    }

    // Helper om de naam van de Hiërarchische Root (3 niveaus omhoog) te krijgen en de hiërarchie te valideren.
    private string GetHierarchicalRootName(Transform t)
    {
        // NEW: Check if object itself is a Product Category
        if (t.CompareTag("Category"))
        {
            Debug.Log($"[HIERARCHY CHECK] Object {t.name} is a Product Category");
            return t.name;
        }
        
        // NEW: Check if parent has Product Parent tag
        Transform parent = t.parent;
        if (parent != null && parent.CompareTag("Product"))
        {
            Debug.Log($"[HIERARCHY CHECK] Parent {parent.name} has Product Parent tag");
            // Look for sibling that is a Category
            foreach (Transform sibling in parent)
            {
                if (sibling.CompareTag("Category"))
                {
                    Debug.Log($"[HIERARCHY CHECK] Found Category sibling: {sibling.name} for Product {t.name}");
                    return sibling.name;
                }
            }
        }
        
        // NEW: Traverse up to find Category or Products root
        Transform current = t.parent;
        while (current != null)
        {
            if (current.CompareTag("Category"))
            {
                Debug.Log($"[HIERARCHY CHECK] Found Category ancestor: {current.name} for Product {t.name}");
                return current.name;
            }
            if (current.name == "Products")
            {
                Debug.Log($"[HIERARCHY CHECK] Found Products root ancestor for {t.name}");
                // Product is direct child of Products, use product tag as category
                return t.name;
            }
            current = current.parent;
        }
        
        // Fallback to original method if no tags found
        Debug.LogWarning($"[HIERARCHY WARNING] No proper tags found for {t.name}, using original method");
        
        // 1. Object's Parent (bv. "water") - DIT IS HET GENRE DAT WE NODIG HEBBEN
        Transform productGenreParent = t.parent;
        if (productGenreParent == null)
        {
            return "INVALID_HIERARCHY";
        }

        // 2. Object's Grandparent (DE VEREISTE ROOT, bv. "Products")
        Transform requiredRoot = productGenreParent.parent;
        if (requiredRoot == null)
        {
            return "INVALID_HIERARCHY";
        }

        // De Validatie: Controleer of de Grandparent de vereiste naam heeft ("Products")
        if (requiredRoot.name == REQUIRED_ROOT_NAME) // REQUIRED_ROOT_NAME is "Products"
        {
            // ✅ Als de hiërarchie klopt, retourneren we de naam van de DIRECTE parent van het object (het 'Genre').
            Debug.Log($"[HIERARCHY CHECK] Validation passed: Root={requiredRoot.name}, Genre={productGenreParent.name}");
            return productGenreParent.name;
        }

        // Filter faalt
        return "INVALID_HIERARCHY";
    }
    
    // Maakt een unieke sleutel die de hiërarchie valideert
    private string GetObjectKey(GameObject obj)
    {
        // NEW: Just use object name directly since we're using tag-based detection
        string objectName = obj.name;
        return objectName;
    }

    // De definitieve opslag van alle totale tijden voor de HUIDIGE sessie
    private string GetCurrentSessionData()
    {
        StringBuilder sb = new StringBuilder();

        foreach (var kvp in accumulatedLookTimes)
        {
            string[] parts = kvp.Key.Split('|');
            string objectName = parts[0];
            string ProductGenre = parts[1];
            float totalTime = kvp.Value;

            // Sla alleen op als de totale tijd de minimale drempel overschrijdt
            if (totalTime < MIN_LOOK_TIME) continue;

            // Formatteer de data als een CSV-regel
            string logEntry = $"{DateTime.Now:yyyy-MM-dd HH:mm:ss}{DELIMITER}{objectName}{DELIMITER}{ProductGenre}{DELIMITER}{totalTime:F2}\n";
            sb.Append(logEntry);
            Debug.Log($"[SESSIE DATA] Voorbereid: {objectName} onder {ProductGenre} ({totalTime:F2}s)");
        }
        return sb.ToString();
    }

    // Zorg ervoor dat ALLE data wordt opgeslagen wanneer de applicatie wordt afgesloten
    private void OnApplicationQuit()
    {
        // 1. Haal de data van de huidige sessie op
        string currentSessionData = GetCurrentSessionData();

        // 2. Combineer de oude data, de scheidingsrij en de nieuwe data
        string finalData = previousSessionData + currentSessionData;

        // 3. Schrijf alles in één keer terug naar het bestand (overschrijft het oude bestand)
        try
        {
            File.WriteAllText(filePath, finalData, Encoding.UTF8);
            Debug.Log($"[FINAL SAVE] Alle sessie data succesvol weggeschreven naar {filePath}");
        }
        catch (Exception e)
        {
            Debug.LogError($"[CRITICAL] Fout bij het definitief schrijven naar CSV: {e.Message}");
        }
    }
}