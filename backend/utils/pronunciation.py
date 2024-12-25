import azure.cognitiveservices.speech as speechsdk
import os
from pathlib import Path
from dotenv import load_dotenv

try:
    from azure.cognitiveservices.speech import AudioConfig, SpeechConfig, SpeechRecognizer
    from azure.cognitiveservices.speech import PronunciationAssessmentConfig, PronunciationAssessmentResult
except ImportError:
    print("Error: Azure Cognitive Services Speech SDK is not installed.")
    print("Please install it using: pip install azure-cognitiveservices-speech")
    speechsdk = None

# Load environment variables
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

def perform_pronunciation_assessment(audio_file_path, reference_text, language):
    try:
        # Print the input parameters
        print(f"Audio file path: {audio_file_path}")
        print(f"Reference text: {reference_text}")
        print(f"Language: {language}")

        # Print the Azure Speech configuration
        print(f"Speech key: {os.environ.get('AZURE_SPEECH_KEY')}")
        print(f"Speech region: {os.environ.get('AZURE_SPEECH_REGION')}")

        speech_config = speechsdk.SpeechConfig(subscription=os.environ.get('AZURE_SPEECH_KEY'), region=os.environ.get('AZURE_SPEECH_REGION'))
        audio_config = speechsdk.audio.AudioConfig(filename=audio_file_path)

        # Create the speech recognizer
        speech_recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_config, language=language)

        # Create pronunciation assessment config
        pronunciation_config = speechsdk.PronunciationAssessmentConfig(
            reference_text=reference_text,
            grading_system=speechsdk.PronunciationAssessmentGradingSystem.HundredMark,
            granularity=speechsdk.PronunciationAssessmentGranularity.Phoneme,
            enable_miscue=True
        )
        pronunciation_config.apply_to(speech_recognizer)

        # Start the pronunciation assessment
        result = speech_recognizer.recognize_once_async().get()

        # Process the result
        pronunciation_result = speechsdk.PronunciationAssessmentResult(result)
        
        # Prepare the detailed response
        response = {
            "accuracy_score": pronunciation_result.accuracy_score,
            "fluency_score": pronunciation_result.fluency_score,
            "completeness_score": pronunciation_result.completeness_score,
            "pronunciation_score": pronunciation_result.pronunciation_score,
            "words": []
        }

        # Add word-level details
        for idx, word in enumerate(pronunciation_result.words):
            word_info = {
                "word": word.word,
                "accuracy_score": word.accuracy_score,
                "error_type": word.error_type,
                "phonemes": []
            }
            
            # Add phoneme-level details for each word
            for phoneme in word.phonemes:
                phoneme_info = {
                    "phoneme": phoneme.phoneme,
                    "accuracy_score": phoneme.accuracy_score
                }
                word_info["phonemes"].append(phoneme_info)
            
            response["words"].append(word_info)

        print(f"Pronunciation assessment result: {response}")
        return response

    except Exception as e:
        print(f"Error in perform_pronunciation_assessment: {str(e)}")
        import traceback
        print(traceback.format_exc())
        # Initialize default response in case of error
        response = {
            "accuracy_score": 0,
            "fluency_score": 0,
            "completeness_score": 0,
            "pronunciation_score": 0,
            "words": []
        }
        return response