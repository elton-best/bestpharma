<?php
namespace App\Mail;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
class AlertePeremption extends Mailable
{
    public function __construct(public string $produit, public string $lot, public string $datePeremption, public int $jours, public string $officine) {}
    public function envelope(): Envelope { return new Envelope(subject: $this->jours === 0 ? 'Lot retiré de la vente : '.$this->lot : 'Péremption à surveiller : '.$this->lot); }
    public function content(): Content { return new Content(text: 'mail.alerte-peremption'); }
}
