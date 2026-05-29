<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow; // <-- 1. CAMBIAR ESTA IMPORTACIÓN
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcastNow // <-- 2. CAMBIAR AQUÍ TAMBIÉN
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $message;

    public function __construct(Message $message)
    {
        $this->message = $message->load('user');
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('thread.' . $this->message->thread_id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'message.created';
    }
}