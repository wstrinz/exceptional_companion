module Hello exposing (..)

import Html exposing (div, p, ul, li, text)
import Html.Events exposing (onClick, onInput)
import Html.Attributes exposing (placeholder)
import Ports
import Task
import Types exposing (..)


send : msg -> Cmd msg
send msg =
    Task.succeed msg
        |> Task.perform identity


view : Model -> Html.Html Msg
view m =
    case m.currView of
        Hidden ->
            div []
                [ Html.button [ onClick <| QueueAction [ ChoosePlan ] ] [ text "choose" ]
                , Html.button [ onClick <| QueueAction [ TryAgain ] ] [ text "try" ]
                , Html.button [ onClick <| QueueAction [ PlayCards ] ] [ text "cards" ]
                , Html.button [ onClick <| QueueAction <| grindAction m.grindCount ChoosePlan ] [ text "grind" ]
                , Html.input [ placeholder (toString m.grindCount), onInput SetGrindCount ] []
                ]

        Shown ->
            div []
                [ ul []
                    [ li []
                        [ text "Here is div again" ]
                    ]
                ]


initialModel : Model
initialModel =
    { currView = Hidden
    , actions = []
    , acting = False
    , grindCount = 5
    }


cmdForAction : Action -> Cmd Msg
cmdForAction action =
    case action of
        ChoosePlan ->
            Ports.choosePlan "dummystring"

        TryAgain ->
            Ports.tryAgain "dummystring"

        PlayCards ->
            Ports.playCards "dummystring"


nextActionCmdIfNotRunning : Model -> Cmd Msg
nextActionCmdIfNotRunning model =
    if model.acting then
        Cmd.none
    else
        send <| NextAction "dummy"


queueActionsToModel : List Action -> Model -> Model
queueActionsToModel actionList model =
    { model | actions = List.concat [ model.actions, actionList ] }


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        Noop ->
            ( model, Cmd.none )

        QueueAction actList ->
            let
                newModel =
                    queueActionsToModel actList model
            in
                ( { newModel | acting = True }, nextActionCmdIfNotRunning model )

        NextAction str ->
            let
                ( cmd, newModel ) =
                    case model.actions of
                        [] ->
                            ( Cmd.none, { model | acting = False } )

                        action :: rest ->
                            ( cmdForAction action, { model | acting = True } )

                newActions =
                    Maybe.withDefault [] <| List.tail model.actions
            in
                ( { newModel | actions = newActions }, cmd )

        SetGrindCount input ->
            case String.toInt input of
                Err msg ->
                    Debug.crash (toString msg)

                Ok n ->
                    ( { model | grindCount = n }, Cmd.none )


grindAction : Int -> Action -> List Action
grindAction nTimes action =
    List.intersperse TryAgain <| List.repeat nTimes action


main : Program Never Model Msg
main =
    Html.program
        { init = ( initialModel, Cmd.none )
        , view = view
        , update = update
        , subscriptions = (\m -> Ports.nextAction NextAction)
        }
