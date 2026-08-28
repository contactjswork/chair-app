<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Trace qu'un client a ouvert l'agenda externe d'un coiffeur depuis CHAIR.
 *
 * Voir la migration create_booking_intents_table pour le pourquoi. En deux
 * mots : ce n'est pas une réservation, c'est le fil qui permet de rappeler au
 * client de faire scanner le QR sur place — le seul geste qui prouve la
 * visite et produit un avis vérifié.
 */
class BookingIntent extends Model
{
    protected $fillable = [
        'user_id',
        'hairdresser_id',
        'salon_id',
        'opened_at',
        'resolved_at',
        'resolution',
    ];

    protected $casts = [
        'opened_at'   => 'datetime',
        'resolved_at' => 'datetime',
    ];

    /** Résolue par une visite vérifiée — c'est le QR qui fait foi. */
    public const RESOLUTION_VISITED = 'visited';

    /** Écartée par le client (« non, finalement je n'y suis pas allé »). */
    public const RESOLUTION_DISMISSED = 'dismissed';

    /**
     * Au-delà de ce délai, rappeler n'a plus de sens : soit la personne y est
     * allée sans scanner, soit elle a changé d'avis. Insister passé un mois
     * serait du harcèlement pour une information dont on n'a plus l'usage.
     */
    public const RELEVANCE_DAYS = 30;

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function hairdresser()
    {
        return $this->belongsTo(HairdresserProfile::class, 'hairdresser_id');
    }

    public function salon()
    {
        return $this->belongsTo(Salon::class);
    }

    /**
     * Marque comme visitée toute intention en attente de ce client chez ce
     * coiffeur, ouverte AVANT la visite.
     *
     * Appelé au moment du scan : c'est ainsi que la boucle se referme, sans
     * jamais rien demander au client. Une intention ouverte APRÈS la visite
     * concerne un futur rendez-vous et doit rester en attente.
     */
    public static function resolveByVisit(int $userId, int $hairdresserId, \DateTimeInterface $visitedAt): int
    {
        return static::where('user_id', $userId)
            ->where('hairdresser_id', $hairdresserId)
            ->whereNull('resolved_at')
            ->where('opened_at', '<=', $visitedAt)
            ->update([
                'resolved_at' => $visitedAt,
                'resolution'  => static::RESOLUTION_VISITED,
            ]);
    }
}
