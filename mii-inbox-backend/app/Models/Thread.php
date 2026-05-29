<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Thread extends Model
{
    protected $fillable = ['subject', 'user_id'];

    public function user() { return $this->belongsTo(User::class); }
    public function messages() { return $this->hasMany(Message::class)->orderBy('created_at', 'asc'); }
    public function latestMessage() { return $this->hasOne(Message::class)->latestOfMany(); }
}