<?php

namespace App\Services;

use GuzzleHttp\Client;
use Illuminate\Http\UploadedFile;

class CloudinaryService
{
    private string $cloudName;
    private string $apiKey;
    private string $apiSecret;
    private Client $client;

    public function __construct()
    {
        $this->cloudName = env('CLOUDINARY_CLOUD_NAME');
        $this->apiKey    = env('CLOUDINARY_API_KEY');
        $this->apiSecret = env('CLOUDINARY_API_SECRET');
        $this->client    = new Client(['timeout' => 30]);
    }

    /**
     * Upload a file to Cloudinary and return the secure_url.
     */
    public function upload(UploadedFile $file, string $folder): string
    {
        $timestamp = time();
        $params    = ['folder' => $folder, 'timestamp' => $timestamp];
        $signature = $this->sign($params);

        $response = $this->client->post(
            "https://api.cloudinary.com/v1_1/{$this->cloudName}/image/upload",
            [
                'multipart' => [
                    [
                        'name'     => 'file',
                        'contents' => fopen($file->getRealPath(), 'r'),
                        'filename' => $file->getClientOriginalName(),
                    ],
                    ['name' => 'folder',    'contents' => $folder],
                    ['name' => 'timestamp', 'contents' => (string) $timestamp],
                    ['name' => 'api_key',   'contents' => $this->apiKey],
                    ['name' => 'signature', 'contents' => $signature],
                ],
            ]
        );

        $data = json_decode((string) $response->getBody(), true);

        return $data['secure_url'];
    }

    /**
     * Delete an image from Cloudinary by public_id.
     */
    public function delete(string $publicId): void
    {
        $timestamp = time();
        $params    = ['public_id' => $publicId, 'timestamp' => $timestamp];
        $signature = $this->sign($params);

        try {
            $this->client->post(
                "https://api.cloudinary.com/v1_1/{$this->cloudName}/image/destroy",
                [
                    'form_params' => [
                        'public_id' => $publicId,
                        'timestamp' => $timestamp,
                        'api_key'   => $this->apiKey,
                        'signature' => $signature,
                    ],
                ]
            );
        } catch (\Exception $e) {
            // Ne pas faire échouer l'upload si la suppression rate
            \Illuminate\Support\Facades\Log::warning('Cloudinary delete failed: ' . $e->getMessage());
        }
    }

    /**
     * Extraire le public_id depuis une URL Cloudinary.
     * Ex: https://res.cloudinary.com/cloud/image/upload/v123/chair/avatars/abc.jpg
     * → chair/avatars/abc
     */
    public function publicIdFromUrl(string $url): ?string
    {
        if (!str_contains($url, 'res.cloudinary.com')) {
            return null;
        }

        // Tout après /upload/
        $afterUpload = preg_replace('#^.*/upload/#', '', $url);

        // Retirer le segment version (v1234567890/)
        $afterVersion = preg_replace('#^v\d+/#', '', $afterUpload);

        // Retirer l'extension
        $publicId = preg_replace('#\.[^.]+$#', '', $afterVersion);

        return $publicId ?: null;
    }

    /**
     * Supprimer un média quel que soit son type (local ou Cloudinary).
     */
    public function deleteOldMedia(?string $url): void
    {
        if (!$url) {
            return;
        }

        if (str_starts_with($url, '/storage/')) {
            \Illuminate\Support\Facades\Storage::disk('public')
                ->delete(str_replace('/storage/', '', $url));
            return;
        }

        if (str_contains($url, 'res.cloudinary.com')) {
            $publicId = $this->publicIdFromUrl($url);
            if ($publicId) {
                $this->delete($publicId);
            }
        }
    }

    private function sign(array $params): string
    {
        ksort($params);
        $toSign = implode('&', array_map(
            fn ($k, $v) => "{$k}={$v}",
            array_keys($params),
            array_values($params)
        ));

        return hash('sha256', $toSign . $this->apiSecret);
    }
}
