# Auth Module Documentation

Système d'authentification modulaire et structuré pour RestauCI.

## Structure des fichiers

```
auth/
├── AuthModal.tsx        # Composant principal (gestionnaire d'état global)
├── AuthForm.tsx         # Formulaire d'authentification (gauche)
├── RegisterVisual.tsx   # Visuel d'inscription (droite - mode register)
├── LoginVisual.tsx      # Visuel de connexion (droite - mode login)
├── types.ts             # Types TypeScript partagés
├── data.ts              # Données constantes (images, badges)
├── index.ts             # Exports centralisés
├── AuthModalDemo.tsx    # Exemple d'utilisation
└── README.md            # Ce fichier
```

## Composants

### AuthModal
Le composant principal qui gère:
- L'état global (email, password, fullName, rememberMe)
- La logique d'authentification
- L'affichage du formulaire ou du visuel selon le mode

**Props:**
```typescript
interface AuthModalProps {
  isOpen: boolean;                                    // Affiche/cache le modal
  onClose: () => void;                               // Callback fermeture
  onSuccess: (user: { name: string; email: string }) => void; // Callback succès
  initialMode?: "login" | "register";                // Mode initial (default: "register")
}
```

**Exemple d'utilisation:**
```typescript
import { AuthModal } from "@/components/auth";

export default function Page() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        Ouvrir connexion
      </button>
      
      <AuthModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSuccess={(user) => {
          console.log("Utilisateur connecté:", user);
        }}
        initialMode="login"
      />
    </>
  );
}
```

### AuthForm
Gère le formulaire d'authentification (gauche):
- Inputs email, password, fullName
- Validation du mot de passe (force meter)
- Boutons de connexion sociale
- Toggle entre login/register

**Props:**
- `authMode`: Mode actuel ("login" | "register")
- `fullName`, `email`, `password`, `rememberMe`: États du formulaire
- `loading`: Indicateur de chargement
- Handlers pour chaque état et soumission

### RegisterVisual
Affiche la grille d'images de nourriture avec badge "+1 200 restaurants"

**Props:**
```typescript
interface RegisterVisualProps {
  foodImages: FoodImage[];
}
```

### LoginVisual
Affiche la combinaison:
- Image de fond (chef)
- Carte statistiques (top-right)
- Témoignage client (bottom-left)
- Barre features (bottom)

**Props:**
```typescript
interface LoginVisualProps {
  loginFeatureBadges: LoginFeatureBadge[];
}
```

## Types

Tous les types sont centralisés dans `types.ts`:

```typescript
interface AuthModalProps { ... }
interface PasswordStrength { ... }
interface FoodImage { ... }
interface LoginFeatureBadge { ... }
```

## Données constantes

Fichier `data.ts` contient:
- **foodImages**: 12 images de nourriture de Unsplash
- **loginFeatureBadges**: 4 badges features du login

Ces données sont facilement modifiables sans toucher aux composants.

## Avantages de cette architecture

✅ **Séparation des préoccupations**: Chaque fichier a une responsabilité unique
✅ **Réutilisabilité**: Chaque composant peut être utilisé indépendamment
✅ **Maintenabilité**: Facile à modifier, tester, déboguer
✅ **Pas de modification de styles**: Les styles restent dans les composants
✅ **Types sûrs**: TypeScript complet
✅ **Documentation claire**: Interface bien définie

## Intégration dans votre application

1. **Importer le composant:**
   ```typescript
   import { AuthModal } from "@/components/auth";
   ```

2. **Utiliser dans votre page/layout:**
   ```typescript
   const [authOpen, setAuthOpen] = useState(false);
   
   <AuthModal
     isOpen={authOpen}
     onClose={() => setAuthOpen(false)}
     onSuccess={(user) => {
       // Votre logique d'authentification
     }}
   />
   ```

3. **Connexion à votre backend:**
   Remplacer la simulation dans `AuthModal.tsx` (handleSubmit):
   ```typescript
   const response = await fetch("/api/auth/login", {
     method: "POST",
     body: JSON.stringify({ email, password })
   });
   ```

## Démo

Utilisez `AuthModalDemo.tsx` pour tester le composant:
```typescript
import AuthModalDemo from "@/components/auth/AuthModalDemo";

export default function Page() {
  return <AuthModalDemo />;
}
```

---

**Créé avec ❤️ pour RestauCI**
