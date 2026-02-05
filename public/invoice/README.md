# Briefpapier voor factuur-PDF

Plaats hier je achtergrondafbeelding voor de factuur (briefpapier).

## Bestandsnaam

- **`letterhead.png`** (aanbevolen) of **`letterhead.jpg`**
- De code zoekt eerst naar PNG, daarna naar JPG.

## Formaat

- **Bestandstype:** PNG of JPEG  
  - PNG: geschikt voor logo’s/tekst met transparantie of subtiele watermerken.  
  - JPEG: kleiner bestandsgrootte voor foto’s of vlakke achtergronden.
- **Afmetingen:** liefst A4-verhouding (1 : √2), bijv.:
  - **595 × 842 px** (scherm / 72 dpi), of  
  - **2480 × 3508 px** (300 dpi voor druk).
- De afbeelding wordt automatisch uitgerekt over de hele A4-pagina (595,28 × 841,89 pt).

## Locatie

```
public/invoice/letterhead.png
```
of
```
public/invoice/letterhead.jpg
```

Als er geen bestand staat, wordt de factuur zonder achtergrond gegenereerd.
