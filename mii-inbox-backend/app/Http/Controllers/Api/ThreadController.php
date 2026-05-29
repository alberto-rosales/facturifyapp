<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Thread;
use App\Events\MessageSent; // <-- 1. IMPORTANTE: Importar tu evento Reverb
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ThreadController extends Controller
{
    public function index(Request $request) 
    {
        $query = Thread::with(['user', 'latestMessage']);
        if ($request->has('search')) {
            $query->where('subject', 'like', '%' . $request->search . '%');
        }
        return response()->json($query->latest()->paginate(15));
    }

    public function store(Request $request)
    {
        $validated = $request->validate(['subject' => 'required|string', 'body' => 'required|string']);
        
        $thread = Thread::create(['subject' => $validated['subject'], 'user_id' => Auth::id()]);
        
        // Creamos el mensaje inicial del hilo
        $message = $thread->messages()->create(['user_id' => Auth::id(), 'body' => $validated['body']]);

        // DESPACHAR REVERB
        broadcast(new MessageSent($message));

        return response()->json($thread->load('messages'), 201);
    }

    public function show($id) 
    {
        $thread = Thread::with(['messages.user', 'user'])->findOrFail($id);
        $thread->messages()->where('user_id', '!=', Auth::id())->update(['is_read' => true]);
        return response()->json($thread);
    }

    
    public function storeMessage(Request $request, $id) 
    {
        $thread = Thread::findOrFail($id);
        $validated = $request->validate(['body' => 'required|string']);

        $message = $thread->messages()->create(['user_id' => Auth::id(), 'body' => $validated['body']]);
        $message->load('user');

        // DESPACHAR REVERB
        broadcast(new MessageSent($message));

        return response()->json($message, 201);
    }
}