Officine : {{ $officine }}
Produit : {{ $produit }}
Lot : {{ $lot }}
Date de péremption : {{ $datePeremption }}
@if($jours === 0)
La date de péremption est atteinte. Ce lot ne peut plus être vendu. Vérifiez son retrait du rayon et son isolement.
@else
Ce lot arrive à péremption dans {{ $jours }} jour(s). Vérifiez les quantités restantes et les dispositions à prendre.
@endif
Consultez le suivi des péremptions dans votre espace de travail.
