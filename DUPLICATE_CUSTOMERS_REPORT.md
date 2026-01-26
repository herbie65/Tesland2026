# 🔍 DUBBELE KLANTEN RAPPORT

**Datum**: 26 januari 2026  
**Totaal duplicaten**: 32 email adressen komen meerdere keren voor

---

## 📋 OVERZICHT DUPLICATEN

Hieronder alle dubbele klanten gegroepeerd per email:

| Email | Aantal | Bronnen | Namen | IDs |
|-------|--------|---------|-------|-----|
| ciliaenjan@gmail.com | 2 | magento \| manual | Jan Vink \| Vink, Dhr. J. | b4f71bb6-0029-4b8b-854d-e9a6f32ad290, 6b8bdb20-0aeb-4cea-a974-2b1c25f20de4 |
| dave@rader.nl | 2 | manual \| magento | Rader \| David Rader | 0aa0fa6c-89cb-498e-aa48-2b22a75c86bc, 36f393ec-947a-4e26-8ad5-78546659545a |
| dick@xri.eu | 2 | magento \| manual | Dick Van der starre \| Van der Starre, Dhr. D. | 5078cfce-d685-4567-a64e-8a234326de4f, 84a52873-f69c-447d-b275-5c2e046e30d1 |
| edwin@voltacom.nl | 2 | magento \| manual | Edwin de Rooij \| Voltacom (Edwin de Rooij) | c79abb0f-a338-4daa-bd05-a058dab0a206, a913ea82-b8f9-4211-aac9-75d8891766d8 |
| franswassenaar@me.com | 2 | magento \| manual | Frans Wassenaar \| Wassenaar, Dhr. F. (Frans Wassenaar) | b752f600-76d7-49da-b9e7-582139b4c4a8, 1b15cab3-1e63-400c-9fc5-4dc78e2b45e6 |
| ibjrots@storoni.eu | 2 | magento \| manual | Ino Rots \| Rots, Dhr. I. | a8d0ea9c-b03b-484c-938d-d9a5a06acf0f, bb355671-93c9-4c68-8574-18576590e4ba |
| info@rijschoolcsk.nl | 2 | manual \| magento | Rijschool CSK (Yusuf Coskunsu) \| Yusuf Cartunsu | 7a58fb7c-a095-46e2-b28f-6cd0597d6359, c634b7e1-0a3f-4bd3-b689-ca3a2003d218 |
| info@verhoeksexclusief.nl | 2 | manual \| magento | Verhoeks VOF (Aart Verhoeks) \| Bert Langendijk | af2faf23-1f9a-412a-a151-9b95a451bdad, 4f47024d-65e0-48d2-bd01-4eeeb741945e |
| invoice@wolvisiongroup.com | 2 | magento \| manual | Lars Wolf \| BV WOLVISION GROUP (Lars Wolf) | 715995c4-8fec-44dd-bc64-53f1f8b440c8, 6bcf35b9-e86c-43dd-8e45-99c1bde6c2ec |
| joost@justachieve.nl | 2 | magento \| manual | Joost van Roijen \| Just Achieve, Dhr. J. (Joost van Roijen) | c3d2082b-98d3-441b-8030-3a6e7276b8fa, 855711cd-b764-44cf-a72c-02c968b9080f |

... en 22 meer

---

## 🎯 MERGE STRATEGIE

### Voorstel: **Automatische Merge**

Voor elke dubbele email:
1. **Kies "master" record**: Manual (garage) klant (bevat waarschijnlijk voertuigen, werkorders)
2. **Merge data**:
   - Voeg Magento klantnummer toe aan master
   - Verplaats alle relaties van duplicaat naar master
   - Markeer duplicaat als `merged` of verwijder
3. **Behoud**: Voertuigen, werkorders, facturen blijven bij manual klant

### Merge Regels:

```
Master = Manual klant (bevat garage data)
Duplicaat = Magento klant (alleen webshop data)

MERGE:
- customerNumber: voeg Magento ID toe
- email: behoud van master
- phone/mobile: behoud beste (langste waarde)
- address: behoud van master (garage heeft waarschijnlijk betere data)
- source: update naar 'magento,manual'
```

---

## 🔧 HANDMATIGE REVIEW

Voordat we mergen, check deze gevallen:

### ⚠️ Verschillende namen voor zelfde email:
- `info@rijschoolcsk.nl`: "Rijschool CSK (Yusuf Coskunsu)" vs "Yusuf Cartunsu"
- `info@verhoeksexclusief.nl`: "Verhoeks VOF (Aart Verhoeks)" vs "Bert Langendijk"

→ **Mogelijk verschillende personen binnen zelfde bedrijf!**

---

## 📊 VOLLEDIGE LIJST

Zie attached CSV export voor complete lijst met alle details.

---

## 🚀 VOLGENDE STAP

Wilt u:
1. **A) Automatische merge** - Script draait en merged alle duplicaten volgens bovenstaande regels
2. **B) CSV export eerst** - Bekijk eerst alle duplicaten in Excel voor handmatige review
3. **C) Interactieve merge** - Per duplicaat vragen welke te behouden

Wat is uw voorkeur?
