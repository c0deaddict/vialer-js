<component class="component-call" :class="classes('component')">
    <!-- Call information during a call. Hide when the keypad takes too muchs space. -->
    <div class="call-info" v-if="(!call.keypad.active || call.keypad.display === 'dense') && !['new'].includes(call.status)">
        <icon class="contact-avatar" name="user"/>
        <div class="info-number">{{call.number}}</div>
        <div class="info-name" v-if="call.displayName">{{call.displayName}}</div>
        <div class="info-status">
            <span>{{sessionTime}} - </span>
            <span>{{callStatus}}</span>
        </div>
    </div>

    <!-- Call options like transfer ops, on-hold and keypad -->
    <div class="call-options" v-if="['accepted'].includes(call.status)">

        <div class="rounded-button-with-text">
            <div class="rounded-button" @click="muteToggle" :class="classes('mute-button')">
                <icon name="mute"/>
            </div>
            <p class="ca">{{$t('mute')}}</p>
        </div>

        <div class="rounded-button-with-text" v-if="call.transfer.type !== 'accept'">
            <div class="rounded-button" @click="transferToggle" :class="classes('transfer-button')">
                <icon name="transfer"/>
            </div>
            <p class="ca">{{$t('transfer')}}</p>
        </div>
        <div class="rounded-button-with-text" v-else>
            <div class="rounded-button" @click="transferFinalize">
                <icon name="merge"/>
            </div>
            <p class="ca">{{$t('transfer')}}</p>
        </div>

        <div class="rounded-button-with-text">
            <div class="rounded-button" @click="holdToggle" :class="classes('hold-button')">
                <icon name="on-hold"/>
            </div>
            <p class="ca">{{$t('on hold')}}</p>
        </div>

        <div class="rounded-button-with-text">
            <div class="rounded-button" @click="keypadToggle" :class="classes('dialpad-button')">
                <icon name="dialpad"/>
            </div>
            <p class="ca">{{$t('keypad')}}</p>
        </div>
    </div>

    <!-- Show only when transfer is active and the call is still active -->
    <div class="transfer-options" v-if="call.transfer.active && ['accepted'].includes(call.status)">
        <div class="transfer-buttons">
            <div class="transfer-button ca" :class="classes('attended-button')" @click="transferMode('attended')">
                {{$t('attended transfer')}}
            </div>
            <div class="transfer-button ca" :class="classes('blind-button')" @click="transferMode('blind')">
                {{$t('blind transfer')}}
            </div>
        </div>
        <div class="transfer-text cf">{{$t('select a transfer recipient')}}:</div>
        <CallKeypad :model.sync="call.keypad.number" display="dense" :call="call" mode="call" :number="call.keypad.number"/>
    </div>
    <!-- Show attended/blind transfer option and a dense keypad when transfer is active and the call is still active -->
    <div class="new-call" v-if="call.status === 'new' || call.keypad.active">
        <CallKeypad :model.sync="call.keypad.number" :call="call" :display="call.keypad.display"
            :mode="call.keypad.mode" :number="call.keypad.number"/>
    </div>

    <div class="call-actions" v-if="!call.hangup.disabled">
        <div class="rounded-button action decline test-button-terminate" v-if="callCanTerminate"
            @click="callTerminate(call)">
            <icon name="hang-up"/>
        </div>

        <div class="rounded-button action accept test-button-accept" v-if="call.status === 'invite'" @click="callAccept(call)">
            <icon name="phone"/>
        </div>
    </div>
</component>
