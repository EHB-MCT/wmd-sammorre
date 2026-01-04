# C# Coding and Naming Standards for WMD Sam Morre

## Identifier Names

### Naming Rules

Valid identifiers must follow these rules.
If a rule is violated, C# compiler will produce an error.

| Rule                   | Description                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| **Start character**    | Must begin with a **letter** or **underscore (`_`)**.                                                |
| **Allowed characters** | Unicode letters, digits, connecting, combining, or formatting characters.                            |
| **Escaping keywords**  | Prefix with `@` to use a keyword as an identifier. Example: `@if` declares an identifier named `if`. |

> Verbatim identifiers (with `@`) are mostly for interoperability with other languages.

---

### Naming Conventions

These are **recommended patterns** used throughout .NET and Unity development.
They improve consistency and readability, but are **not compiler-enforced**.

#### General Conventions

| Element                                 | Convention    | Example         |
| --------------------------------------- | ------------- | --------------- |
| **Types / Namespaces / Public members** | PascalCase    | `PlayerController` |
| **Local variables / Parameters**        | camelCase     | `movementSpeed`    |
| **Private instance fields**             | `_camelCase`  | `_currentHealth`   |
| **Static fields**                       | `s_camelCase` | `s_instanceCount`   |
| **Constants**                           | PascalCase    | `MaxRetries`    |

#### Unity-Specific Conventions

| Element                                 | Convention    | Example         |
| --------------------------------------- | ------------- | --------------- |
| **Unity Components**                      | PascalCase    | `Rigidbody`, `Animator` |
| **Serialized Fields**                      | `_camelCase`  | `_maxSpeed` |
| **Constants**                           | `k_PascalCase` | `k_DefaultTurnSpeed`    |

#### Interface & Attribute Naming

* **Interfaces** → Prefix with `I` (e.g., `IDamageable`, `IMovable`).
* **Attributes** → Suffix with `Attribute` (e.g., `SerializableAttribute`).
* **Enums** →

  * Singular noun for non-flags: `GameState`
  * Plural noun for flags: `PowerUpTypes`

#### Best Practices

* Avoid two consecutive underscores (`__`) — reserved for compiler use.
* Prefer **clarity over brevity**.
* Avoid obscure abbreviations (use only common ones like `UI`, `HP`, `MP`).
* Use **meaningful namespaces** (e.g., `WMD.Sammorre.GamePlay.Player`).
* Choose **descriptive component names** for Unity GameObjects.

#### Single-letter Names (for syntax examples only)

| Use              | Letter |
| ---------------- | ------ |
| Structs          | `S`    |
| Classes          | `C`    |
| Methods          | `M`    |
| Variables        | `v`    |
| Parameters       | `p`    |
| `ref` Parameters | `r`    |

---

<details>
<summary> Pascal Case Guidelines</summary>

Use **PascalCasing** when naming:

* Classes
* Interfaces (prefixed with `I`)
* Structs
* Delegates
* Public members (fields, properties, events, methods, local functions)
* Record parameters (become public properties)
* Unity Component classes

Example:

```csharp
public class PlayerController : MonoBehaviour
{
    public int MaxHealth { get; set; }
    public void TakeDamage(int amount) { }
}
```

</details>

---

<details>
<summary> Camel Case Guidelines</summary>

Use **camelCasing** for:

* Private/internal fields (prefixed with `_`)
* Local variables
* Method parameters
* Primary constructor parameters (class/struct)
* Static fields → `s_`, Thread-static → `t_`

Example:

```csharp
private int _currentHealth;
public void AddHealth(int healAmount)
{
    var newHealth = _currentHealth + healAmount;
}
```

</details>

---

<details>
<summary> Unity Component Naming</summary>

For Unity-specific components:

```csharp
public class EnemyController : MonoBehaviour
{
    [SerializeField] private float _moveSpeed;
    [SerializeField] private int _damage;
    [SerializeField] private Rigidbody _rigidbody;
    
    private const float k_AttackRange = 2.0f;
}
```

</details>

---

<details>
<summary> Type Parameter Naming</summary>

| Guideline                            | Example                              |
| ------------------------------------ | ------------------------------------ |
| Descriptive name (prefixed with `T`) | `TItem`, `TSession`                  |
| Single-letter if clear               | `T`                                  |
| Reflect constraints in name          | `TSession` for `ISession` constraint |

Example:

```csharp
public interface IItemRepository<TItem> where TItem : Item { }
```

</details>

---

<details>
<summary> Extra Naming Guidelines</summary>

* If examples omit `using` directives, use fully qualified namespaces.
* Break long qualified names after a dot (`.`).
* Don’t rename auto-generated objects from Visual Studio.
* Match Unity script file names with main class names.

</details>

---

## Coding Conventions

### Language Guidelines

* Use **modern C# features** and syntax (C# 10+ where available).
* Avoid catching `System.Exception` directly.
* Use **specific exception types** for clarity.
* Prefer **LINQ** for readable collection logic.
* Use **async/await** for I/O-bound operations.
* Be mindful of deadlocks (`ConfigureAwait`).
* Use **C# keywords** (`int`, `string`) instead of framework types.
* Prefer `int` over unsigned types.
* Use `var` **only when type is obvious**.
* Write simple, clear, and maintainable code.

---

### String Data

* Use **string interpolation** (`$"..."`) instead of concatenation.
* For loops or large string building, use `StringBuilder`.
* Prefer **raw string literals** over escape sequences.
* Use **expression-based interpolation** instead of positional.

Example:

```csharp
var message = $"Player {playerName} took {damage} damage at {DateTime.Now}.";
```

---

### Constructors & Initialization

| Type               | Naming for Primary Constructor Parameters |
| ------------------ | ----------------------------------------- |
| **Record**         | PascalCase                                |
| **Class / Struct** | camelCase                                 |

Use **required properties** instead of constructors for mandatory initialization.

---

### Arrays & Collections

* Use **collection expressions** for initialization.

```csharp
var spawnPoints = [transform1, transform2, transform3];
```

---

### Delegates

Prefer built-in generic delegates:

```csharp
Action<float> onHealthChanged = (health) => UpdateUI(health);
Func<int, int, bool> isHealthAboveThreshold = (current, threshold) => current > threshold;
```

Use concise syntax:

```csharp
Action<string> printMessage = Debug.Log;
printMessage("Game started");
```

---

### Exception Handling

* Use `try-catch` for recoverable exceptions.
* Use `using` instead of `try-finally` for disposing resources.

```csharp
using var file = new FileStream(savePath, FileMode.Create);
```

---

### Operators

Use:

* `&&` instead of `&`
* `||` instead of `|`

---

### Object Instantiation

Use concise syntax and initializers:

```csharp
Player player = new() { Name = "Alice", Health = 100 };
```

---

### Event Handling

Use **lambdas** for event handlers that don't need removal:

```csharp
button.onClick.AddListener(() => StartGame());
healthComponent.OnHealthChanged += (health) => UpdateHealthBar(health);
```

---

### Static Members

* Call static members using the **class name**:

  ```csharp
  Mathf.Abs(value);
  Time.deltaTime;
  ```
* Don’t qualify base class static members with derived class names.

---

<details>
<summary> LINQ Query Guidelines</summary>

* Use **meaningful query variable names**.
* Use **PascalCase** for anonymous type properties.
* Rename ambiguous fields (`PlayerName`, not `Name`).
* Use **implicit typing (`var`)** for query results.
* Align query clauses under `from` clause.
* Place `where` clauses early.
* Use multiple `from` clauses instead of `join`.

Example:

```csharp
var activeEnemies =
    from enemy in allEnemies
    from weapon in enemy.Weapons
    where weapon.Damage > 10
    select new { enemy.Name, weapon.Damage };
```

</details>

---

<details>
<summary> Implicitly Typed Variables (`var`)</summary>

| Rule                                               | Example                                        |
| -------------------------------------------------- | ---------------------------------------------- |
| Use `var` when type is **obvious**                 | `var rb = GetComponent<Rigidbody>();`            |
| Avoid when type is unclear                         | NOT `var data = GetComplexData();`                    |
| Don't encode type in variable name                 | BUT `string playerName` not `string playerString`  |
| Use `dynamic` only for runtime type inference      |                                                |
| `for` loops → ok; `foreach` → avoid (unless clear) |                                                |
| LINQ queries → always use `var` (anonymous types)  |                                                |

</details>

---

### File-Scoped Namespaces

Use file-scoped namespaces for single-namespace files:

```csharp
namespace WMD.Sammorre.GamePlay.Player;
```

Place `using` directives **outside** the namespace for clarity.

---

## Unity-Specific Standards

### Component Naming and Organization

| Element                                 | Convention    | Example         |
| --------------------------------------- | ------------- | --------------- |
| **Script Files**                          | PascalCase    | `PlayerController.cs` |
| **GameObject Names**                      | PascalCase    | `Player`, `Enemy`, `Weapon` |
| **Layer Names**                           | PascalCase    | `Default`, `Player`, `Interactable` |
| **Tag Names**                            | PascalCase    | `Player`, `Enemy`, `Pickup` |

### Serialized Fields

* Use `[SerializeField]` for private fields that need inspector access
* Add `[Tooltip]` for complex fields
* Use `[Header]` to organize inspector fields

```csharp
public class PlayerController : MonoBehaviour
{
    [Header("Movement Settings")]
    [Tooltip("Maximum movement speed in units per second")]
    [SerializeField] private float _maxSpeed = 5f;
    
    [Header("Combat Settings")]
    [SerializeField] private int _maxHealth = 100;
    [SerializeField] private float _attackRange = 2f;
}
```

### Unity Method Lifecycle

| Method Type                   | Naming Convention | Example                          |
| ----------------------------- | ---------------- | -------------------------------- |
| Unity Event Methods            | Exact Unity name | `Awake()`, `Start()`, `Update()` |
| Custom Event Handlers        | PascalCase        | `OnHealthChanged()`, `OnWeaponEquipped()` |
| Public API Methods           | PascalCase        | `TakeDamage()`, `MoveToPosition()` |
| Private Helper Methods      | camelCase        | `calculateDamage()`, `updateUI()` |

### Constants and Magic Numbers

* Define constants for frequently used values
- Use `k_` prefix for Unity constants
- Avoid magic numbers in code

```csharp
public class GameSettings
{
    private const float k_DefaultTurnSpeed = 90f;
    private const float k_AttackRange = 2.0f;
    private const int k_MaxPlayerCount = 4;
}
```

---

## Style Guidelines

| Style       | Rule                                       |
| ----------- | ------------------------------------------ |
| Indentation | 4 spaces, no tabs                          |
| Line length | ≤ 100 characters for readability            |
| Brace style | Allman (`{` on new line)                   |
| Line breaks | Before binary operators                    |
| Formatting  | One statement and one declaration per line |

Example:

```csharp
if (isPlayerAlive)
{
    ProcessPlayerInput();
}
else
{
    ShowGameOverScreen();
}
```

---

### Comment Style

| Rule                                       | Example                                                |
| ------------------------------------------ | ------------------------------------------------------ |
| Use single-line comments (`//`)            | `// Process player movement input.`                       |
| Avoid multi-line (`/* ... */`) comments    |                                                        |
| XML comments for public APIs               | `/// <summary>Takes damage from source...</summary>` |
| Separate line for comments                 |   not inline                                           |
| Capitalize first letter, end with a period |                                                        |
| One space after `//`                       |                                                        |

### Unity Comment Style

```csharp
/// <summary>
/// Controls player movement and combat mechanics
/// </summary>
public class PlayerController : MonoBehaviour
{
    // Initialize components at start
    private void Awake()
    {
        _rigidbody = GetComponent<Rigidbody>();
    }
    
    // Handle movement input each frame
    private void Update()
    {
        var movement = Input.GetAxis("Horizontal");
        MovePlayer(movement);
    }
}
```

---

### Layout Conventions

* Use **default Visual Studio formatting** (4-space indents, smart indenting).
* One **statement** and **declaration** per line.
* Add a **blank line** between methods and properties.
* Indent continuation lines one tab stop.
* Use parentheses to clarify complex expressions.

---

## Enforcement and Tools

### Recommended Tools
* Use Visual Studio or Rider with code analysis
* Configure code formatting rules in .editorconfig
* Use Unity's built-in code analysis where available

