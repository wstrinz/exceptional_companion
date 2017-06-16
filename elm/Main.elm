module Hello exposing (..)

import Html exposing (div, p, ul, li, text)
import Html.Events exposing (onClick)
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
                , Html.button [ onClick <| QueueAction <| grindAction 5 ChoosePlan ] [ text "grind" ]
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
    }


cmdForAction : Action -> Cmd Msg
cmdForAction action =
    case action of
        ChoosePlan ->
            Ports.choosePlan "dummystring"

        TryAgain ->
            Ports.tryAgain "dummystring"


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
                    case List.head model.actions of
                        Nothing ->
                            ( Cmd.none, { model | acting = False } )

                        Just action ->
                            ( cmdForAction action, { model | acting = True } )

                newActions =
                    Maybe.withDefault [] <| List.tail model.actions
            in
                ( { newModel | actions = newActions }, cmd )


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
